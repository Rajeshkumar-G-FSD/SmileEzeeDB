/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  type Unsubscribe 
} from 'firebase/firestore';
import { db } from './lib/firebase';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home as HomeIcon, 
  Info, 
  Stethoscope, 
  Mail, 
  Calendar, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Smile, 
  Sparkles, 
  Clock,
  ArrowRight,
  Menu,
  X,
  MessageCircle,
  Instagram,
  Facebook,
  UserCog
} from 'lucide-react';

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
type Page = 'home' | 'about' | 'services' | 'gallery' | 'contact' | 'doctor-login' | 'dashboard';

interface AppointmentData {
  id: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  slot: string;
  issue: string;
  address: string;
  type: string;
  status: 'pending' | 'completed' | 'cancelled';
  paymentStatus: 'paid' | 'unpaid';
  billAmount: number;
}

const TODAY = new Date().toISOString().split('T')[0];

const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
  '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  '07:00 PM', '07:30 PM'
];

const APPOINTMENT_TYPES = [
  'Exam & Cleaning',
  'Consultation',
  'Checkup',
  'Treatment',
  'Urgent Dental Care',
  'Others'
];

const isSlotAvailable = (slot: string, selectedDate: string): boolean => {
  if (!selectedDate) return true;
  if (selectedDate !== TODAY) return true;
  const [time, period] = slot.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && hours !== 12) h += 12;
  if (period === 'AM' && hours === 12) h = 0;
  const slotTime = new Date();
  slotTime.setHours(h, minutes, 0, 0);
  return slotTime > new Date();
};
const DENTAL_SERVICES = [
  'Dental Implants',
  'Whitening / Bleaching',
  'Root Canal Treatment',
  'Orthodontics / Braces',
  'Periodontitis / Gum Treatment',
  'Lasers In Dentistry',
  'Preventive-Dentistry',
  'Fillings',
  'Inlays / Onlays',
  'Veneers',
  'Oral / Maxillo Facial Surgery',
  'Dentures',
  'Ceramic Crown / Bridges',
  'Pediatric',
  'Cosmetic / Esthetic',
  'Crown And Bridge',
  'Tooth Removal',
  'Smile Design',
  'Guided Surgery',
  'Full Mouth Rehabilitation'
];

const syncToSheet = async (data: any) => {
  const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
  if (!SCRIPT_URL || SCRIPT_URL.includes("PASTE_YOUR_NEW_SCRIPT_URL_HERE")) {
    console.warn("Google Script URL not configured. Data will not sync to Sheets.");
    return;
  }
  
  try {
    // Map internal names to Google Sheet expected names
    const mappedData = {
      fullName: data.name,
      phone: data.phone,
      appointmentType: data.appointmentType || data.type,
      dentalService: data.dentalService,
      preferredDate: data.date,
      timeSlot: data.slot,
      address: data.address,
      comments: data.issue,
      source: data.source || 'Website'
    };

    const params = new URLSearchParams();
    for (const key in mappedData) {
      if (Object.prototype.hasOwnProperty.call(mappedData, key)) {
        params.append(key, String((mappedData as any)[key] ?? ""));
      }
    }

    // Use URL with parameters for maximum compatibility with GS redirects
    const urlWithParams = `${SCRIPT_URL}?${params.toString()}`;

    await fetch(urlWithParams, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache"
    });
    
    console.log("Booking synced to Google Sheet successfully.");
  } catch (error) {
    console.error("Error syncing to sheet:", error);
  }
};

// --- Shared Components ---

const Footer = ({ setPage }: { setPage: (p: Page) => void }) => (
  <footer className="bg-surface-container-lowest border-t border-outline-variant/30 py-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-2">
        <div className="flex items-center gap-3 mb-6">
          <img 
            src="https://i.postimg.cc/c434DgDB/smile-tranparaent.png" 
            alt="Smile Ezee Logo" 
            className="h-14 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <p className="text-primary/70 max-w-sm mb-4">
          Smile Ezee Dentistry is a premier dental clinic in Erode, committed to providing advanced oral healthcare with a focus on patient comfort and clinical excellence.
        </p>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary/40 mb-6">Quick Links</h4>
        <ul className="space-y-3">
          <li><button onClick={() => setPage('home')} className="text-sm text-primary/70 hover:text-secondary transition-colors">Home</button></li>
          <li><button onClick={() => setPage('about')} className="text-sm text-primary/70 hover:text-secondary transition-colors">About Us</button></li>
          <li><button onClick={() => setPage('services')} className="text-sm text-primary/70 hover:text-secondary transition-colors">Services</button></li>
          <li><button onClick={() => setPage('gallery')} className="text-sm text-primary/70 hover:text-secondary transition-colors">Gallery</button></li>
          <li><button onClick={() => setPage('contact')} className="text-sm text-primary/70 hover:text-secondary transition-colors">Contact</button></li>
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary/40 mb-6">Contact</h4>
        <ul className="space-y-3 text-sm text-primary/70">
          <li className="flex items-start gap-2"><MapPin size={16} className="mt-1 shrink-0" /> 9, Perundurai Rd, Teachers Colony, Kumalan Kuttai, Erode, Tamil Nadu 638011</li>
          <li className="flex items-center gap-2"><Phone size={16} /> 070109 56291</li>
        </ul>
        <div className="mt-6">
          <button 
            onClick={() => setPage('doctor-login')} 
            className="text-[10px] uppercase font-bold tracking-widest text-primary/30 hover:text-secondary transition-colors"
          >
            Doctor Access
          </button>
        </div>
        <div className="flex gap-4 mt-5">
          <a 
            href="https://www.instagram.com/smileezeedentistry/" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Smile Ezee Dentistry on Instagram"
            className="p-2 bg-secondary/10 text-secondary rounded-full hover:bg-secondary hover:text-white hover:-translate-y-1 transition-all duration-300 shadow-sm"
          >
            <Instagram size={20} />
          </a>
          <a 
            href="https://www.facebook.com/smileezeedentistry/" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Smile Ezee Dentistry on Facebook"
            className="p-2 bg-secondary/10 text-secondary rounded-full hover:bg-secondary hover:text-white hover:-translate-y-1 transition-all duration-300 shadow-sm"
          >
            <Facebook size={20} />
          </a>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 pt-8 border-t border-outline-variant/20 text-center">
      <p className="text-xs text-primary/50">
        © 2026 Smile Ezee Dentistry. All Rights Reserved. Developed by{' '}
        <a
          href="https://www.datazync.com"
          target="_blank"
          rel="noreferrer"
          className="relative inline-block font-semibold text-secondary transition-all duration-300 hover:-translate-y-0.5 hover:text-primary after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-secondary after:transition-transform after:duration-300 hover:after:scale-x-100"
        >
          www.datazync.com
        </a>
      </p>
    </div>
  </footer>
);

// --- Page Components ---

const ServiceTypewriter = ({ words }: { words: string[] }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [visibleText, setVisibleText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const isWordComplete = !isDeleting && visibleText === currentWord;
    const isWordCleared = isDeleting && visibleText === '';
    const delay = isWordComplete ? 1300 : isWordCleared ? 250 : isDeleting ? 35 : 65;

    const timer = window.setTimeout(() => {
      if (isWordComplete) { setIsDeleting(true); return; }
      if (isWordCleared) {
        setIsDeleting(false);
        setWordIndex((index) => (index + 1) % words.length);
        return;
      }
      const nextLength = visibleText.length + (isDeleting ? -1 : 1);
      setVisibleText(currentWord.slice(0, nextLength));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [isDeleting, visibleText, wordIndex, words]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-secondary/50">We specialize in</span>
      <div className="flex items-baseline gap-1 min-h-12">
        <span
          className="text-3xl md:text-4xl font-bold"
          style={{ background: 'linear-gradient(135deg, #0061a5 0%, #66affe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
        >
          {visibleText || ' '}
        </span>
        <span className="inline-block w-[3px] h-8 bg-secondary animate-pulse rounded-full" aria-hidden="true" />
      </div>
      <div className="h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, #0061a5, #66affe, transparent)', width: '200px' }} />
    </div>
  );
};

const HomePage = ({ setPage, setIsBookingOpen }: { setPage: (p: Page) => void, setIsBookingOpen: (o: boolean) => void }) => {
  const heroRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const typewriterRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Blobs float animation
      gsap.to(blob1Ref.current, { y: -24, x: 12, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(blob2Ref.current, { y: 20, x: -16, duration: 6.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });

      // Hero entrance timeline
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(headingRef.current,   { opacity: 0, y: 50, duration: 0.8 })
        .from(typewriterRef.current,{ opacity: 0, y: 24, duration: 0.6 }, '-=0.4')
        .from(descRef.current,      { opacity: 0, y: 20, duration: 0.6 }, '-=0.35')
        .from(buttonsRef.current,   { opacity: 0, y: 16, duration: 0.5 }, '-=0.3')
        .from(imageRef.current,     { opacity: 0, x: 50, scale: 0.96, duration: 0.9, ease: 'power2.out' }, '-=0.75');
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
  <>
    {/* Hero */}
    <section ref={heroRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 flex flex-col md:flex-row items-center gap-16 overflow-hidden">
      {/* Decorative blobs */}
      <div ref={blob1Ref} className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #0061a5, transparent)' }} />
      <div ref={blob2Ref} className="pointer-events-none absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #66affe, transparent)' }} />

      <div className="flex-1 space-y-7 relative z-10">
        <h1 ref={headingRef} className="text-5xl md:text-6xl font-bold text-primary leading-tight">
          Your Smile,<br />
          <span style={{ background: 'linear-gradient(135deg, #002045 30%, #0061a5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Our Priority</span>
        </h1>

        <div ref={typewriterRef}>
          <ServiceTypewriter words={DENTAL_SERVICES} />
        </div>

        <p ref={descRef} className="text-lg text-primary/65 max-w-lg leading-relaxed">
          Experience premium, anxiety-free dental care in a state-of-the-art environment.
          We combine clinical excellence with modern wellness to deliver the smile you deserve.
        </p>

        <div ref={buttonsRef} className="flex flex-wrap gap-4">
          <button className="btn-primary" onClick={() => setIsBookingOpen(true)}>Book Appointment</button>
          <button className="btn-outline" onClick={() => setPage('contact')}>Contact Us</button>
        </div>
      </div>

      {/* Hero image with frame */}
      <div ref={imageRef} className="flex-1 w-full relative">
        {/* Decorative frame offset */}
        <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-2xl border-2 border-secondary/20" />
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDp-lmJ34oGCE2dTdRbuI3BRryqs9tria5LW1URB607yj0J3WTmPdZ-OuzXCuokVJmxlhrzCLOtjwHWAlWUe1gYX9pFHq9xTxuhThw6c7c1gfLDIaIlhRLZqrq6H29YBfMcNxVFv0Tya8knB0B32jJindto7E-Apy-yvCtChwEare6GCnk0pWbxEPT6H8j1kxoJQpzDug19imr2spSj6x-rnxRwWmTYz3bn6c_dMHqoyeGhmT4ox6vmAgCTwjMziI_13Q5gDTGvOSgc"
            alt="Modern Dental Care"
            className="w-full h-full object-cover aspect-[4/3]"
            referrerPolicy="no-referrer"
          />
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Floating stat card */}
        <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3 border border-outline-variant/20 z-10">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
            <Smile size={20} />
          </div>
          <div>
            <div className="text-lg font-bold text-primary leading-none">5000+</div>
            <div className="text-xs text-primary/50 mt-0.5">Happy Patients</div>
          </div>
        </div>
      </div>
    </section>

    {/* Modern Care Showcase */}
    <section className="bg-surface-container-lowest py-20 border-y border-outline-variant/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Experience Modern Care</h2>
          <p className="text-primary/60">Discover our cutting-edge facilities and commitment to patient comfort.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-72 rounded-xl overflow-hidden group relative">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZGbjVqHRB_o9McXnLjI-BIpTFELmjirCc-iIhUWn-Ws15OsHyf_LjuxjseFyvj_43w_CoWjQiit8x2KdiQDQKGcEaD8h8Mr9C7TL-l7-TT7Ik-Vfo2N5OcBxVoMkpNy5mBVVucwkEQJH0Dl5YICEZB85ZOphSjI6EjLOthu0za9G1u9Nq8O2q-5N8HttilgX0GAHtlJbraDFRjtfhjElGinRkwpo5F5zqxTdeuaNaXdLs0CmX7FqmkL55ilIOlFZ909As_nEWZFDY" 
              alt="Clinic Interior" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="h-72 rounded-xl overflow-hidden group relative">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0OqPg3HyEguIZTPzKfWAiGVdcHC3-RvXfZIBuXatTbqLgHAtjo86CMkLzvqxs0WVvYUTiw-sUcOL9-tAlde3AFrFFQz2kpUbLiHKl6qjllbF1WdaF7QMRdRQpOHzku1z07W6O4sR290HJNMtze2VbSWAhSNbF4R5GewDuYz-ezonU_DhTl8m4oCunZ5XNl4xWeJkcRv2kGUCzDMGpeD8-SW5Kkuh4j-HF2sCyZ6nqJ-8uZxzblFfi7xdKWnRlFqx2Cj3VpMOEwqUX" 
              alt="Technology" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </section>

    {/* Services Highlights */}
    <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <h2 className="text-4xl font-bold text-center mb-16">Comprehensive Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: "General Dentistry", description: "Routine check-ups, cleanings, and preventive care to maintain optimal oral health.", icon: <ShieldCheck className="text-secondary" /> },
          { title: "Cosmetic Enhancements", description: "Professional whitening, veneers, and aesthetic treatments for a radiant smile.", icon: <Sparkles className="text-secondary" /> },
          { title: "Restorative Care", description: "Implants, crowns, and bridges utilizing durable, natural-looking materials.", icon: <Smile className="text-secondary" /> }
        ].map((service, i) => (
          <div key={i} className="glass-card p-8 rounded-xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
              {service.icon}
            </div>
            <h3 className="text-xl font-bold mb-4">{service.title}</h3>
            <p className="text-primary/70">{service.description}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Testimonials */}
    <section className="bg-surface-container py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-4xl font-bold text-center mb-16">Patient Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { 
              quote: "The team at Smile Ezee transformed my approach to dental visits. The environment is so calming, and the care is incredibly precise.",
              author: "ARUN KUMAR",
              img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD5OVsPtsUKrETN_rBBuZ3h7ZLH7JcDSSlCtLColqz25FB4Bh51fLHmZqPUuNEjXRHbF57rCi5w_5W8Bx6ZT434wwKv9xq3DEwCJjDcv-gTQIURflyYphm1lxnk8iMqIPf3HQ4VUvgUrclVkNE0Ge5UtwyR9MvBPda-i1VE00CMjUcKmjRc_8VGSeewZUv3_2y7FzX991qSZ5z_VAL--MA_xWBmEL-lF-8ypTtZhoEW7X2D1GHM7Ol8insZGcYFqSClHRpMG8XCeHSL"
            },
            { 
              quote: "State-of-the-art facility with a genuinely human touch. I've never felt more comfortable in a dentist's chair.",
              author: "PRIYA SENTHIL",
              img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBrkByxX9sub6NFdD2jDQd3ten1ImfrNbSpDvTvWs89hbPXi1Sc9XSqj8MnPOOcLtYDz4HdtKl_tyf62ykzgLYb3h9Me8o6omNLOc9ESSOrSg7M_06_VNm62bJ0PG5W6g9iA7wo9sKZu5BspdqewJ_mgK9T2bn74OfpUH1liyX-4yCqzzmwwc1z4DkVHDMjpGXfYmxzPQcrCl6S4NHX_zgk-ayBwBHWdn1EGCNme0IoEf1wWGZ42FWRHEI1tYfoW6YfPSjrm9Z8Jrxj"
            }
          ].map((item, i) => (
            <div key={i} className="glass-card p-10 rounded-2xl flex gap-6 items-start">
              <img src={item.img} alt={item.author} className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
              <div>
                <p className="text-lg italic text-primary mb-4 leading-relaxed">"{item.quote}"</p>
                <div className="text-xs font-bold text-primary/40 uppercase tracking-widest">{item.author}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </>
  );
};

const AboutPage = () => (
  <div className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
      <div className="space-y-6">
        <h1 className="text-5xl font-bold leading-tight">Expert Dental Care in the Heart of Erode.</h1>
        <p className="text-lg text-primary/70 leading-relaxed">
          At Smile Ezee Dentistry, we believe in transforming lives one smile at a time. Located conveniently at Kumalan Kuttai, Erode, our clinic is designed to be a sanctuary of health and wellness. 
          Led by experienced specialists, we provide a full spectrum of dental services using the latest digital workflows.
        </p>
        <p className="text-primary/60">
          Our practice is built on transparency and precision. We utilize advanced diagnostics and minimally invasive techniques to ensure your journey to a healthier smile is as comfortable as it is effective.
        </p>
      </div>
      <div className="rounded-2xl overflow-hidden shadow-2xl">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZGbjVqHRB_o9McXnLjI-BIpTFELmjirCc-iIhUWn-Ws15OsHyf_LjuxjseFyvj_43w_CoWjQiit8x2KdiQDQKGcEaD8h8Mr9C7TL-l7-TT7Ik-Vfo2N5OcBxVoMkpNy5mBVVucwkEQJH0Dl5YICEZB85ZOphSjI6EjLOthu0za9G1u9Nq8O2q-5N8HttilgX0GAHtlJbraDFRjtfhjElGinRkwpo5F5zqxTdeuaNaXdLs0CmX7FqmkL55ilIOlFZ909As_nEWZFDY" 
          alt="Smile Ezee Clinic" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>

    {/* Mission & Vision */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
      {[
        { title: "Our Mission", icon: <Calendar className="text-secondary" />, text: "To deliver unparalleled dental care through advanced technology and minimally invasive techniques, ensuring every patient achieves optimal oral health in a comfortable environment." },
        { title: "Our Vision", icon: <Info className="text-secondary" />, text: "To be the premier destination for comprehensive dentistry, recognized for our clinical precision, aesthetic mastery, and unwavering commitment to holistic wellness." }
      ].map((box, i) => (
        <div key={i} className="glass-card p-10 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary" />
          <div className="mb-6">{box.icon}</div>
          <h3 className="text-3xl font-bold mb-4">{box.title}</h3>
          <p className="text-primary/70 leading-relaxed">{box.text}</p>
        </div>
      ))}
    </div>

    {/* Specialists */}
    <div className="mb-24">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">Our Lead Specialists</h2>
        <p className="text-primary/60">Meet the dedicated doctors behind your brighter smile.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {[
          { name: "Dr. S. Jothish", role: "BDS, MDS (Prosthodontics)", text: "Specialist in smile design, dental implants, and full-mouth rehabilitation. Committed to delivering aesthetic excellence and functional restoration.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBEc8xW5QTXvyyjvruuEK4KLHBhJJbvlR1jAV_YMaiyirDlUUPtSB_ibMxR4DxpNJi3jK2yQA0lESa6CaPpkRgv7gusHDSHMklxizmzRmmkNfS0beshQyvCGw4RuNgcCj-Jy49hVFbjoUHtClYAGHeteGFDRyXi_CBIxAkaCV65fkF5uRmwU_7mFBvVe5CVYMS1Nhy3C0RlgCXVvudlabJDN-bNGMsTPg-708YkYlQux--id9_kHXaJePNB_a_s125B1HtbB3ywFpsP" },
          { name: "Dr. J. Dharani", role: "BDS, MDS", text: "Expert in advanced conservative dentistry and surgical consultations, focused on personalized patient care and long-term oral health.", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXZ_7-VFMkDN_S05qvJosVoYWJ4vPALUcWUTXPPbJnxTAs807sR5tu33yKmXhpzLTZwmTa5inevG8hEDwGwPwMPeZl_8IZEhuplehCXsnTsXoSbUkHU97QbYPvtskBuJotQNgsSEM7cnEo1spHufOPKviFUHJdQLhtRs5f7Nv0CnB7E4MVWMRJP3c16uHVaddgYEadwOVDCCGDItQCa9O1Ar4wdplEc7QPC0bGvZJKn3O2FhNlXy55DXSJURhqYlsA-cMC-gtyi2eN" }
        ].map((doc, i) => (
          <div key={i} className="glass-card rounded-2xl overflow-hidden h-full flex flex-col">
            <img src={doc.img} alt={doc.name} className="w-full h-80 object-cover" referrerPolicy="no-referrer" />
            <div className="p-8 space-y-2 flex-grow">
              <h3 className="text-2xl font-bold">{doc.name}</h3>
              <div className="text-secondary text-sm font-bold uppercase tracking-widest">{doc.role}</div>
              <p className="text-sm text-primary/70 pt-4 leading-relaxed">{doc.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ServicesPage = ({ setIsBookingOpen }: { setIsBookingOpen: (o: boolean) => void }) => (
  <div className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
    <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
      <h1 className="text-5xl font-bold text-primary">Our Dental Services</h1>
      <p className="text-lg text-primary/60">
        Experience world-class dental care with our comprehensive range of services. 
        We combine advanced technology with a compassionate approach.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {DENTAL_SERVICES.map((service, i) => (
        <div key={i} className="glass-card p-8 rounded-xl group hover:-translate-y-2">
          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-secondary group-hover:text-white transition-colors">
            <Stethoscope size={20} />
          </div>
          <h3 className="text-xl font-bold mb-4">{service}</h3>
          <p className="text-primary/70 mb-6 text-sm">
            Advanced specialized treatments using durable, natural-looking materials and precision technology.
          </p>
          <button className="text-secondary font-bold text-sm flex items-center gap-2" onClick={() => setIsBookingOpen(true)}>
            Book Now <ArrowRight size={14} />
          </button>
        </div>
      ))}
    </div>

    <div className="mt-24 bg-primary-container rounded-3xl p-16 text-center text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1606811841689-23dfddce3e95')] bg-cover bg-center" />
      <div className="relative z-10 space-y-6">
        <h2 className="text-4xl font-bold">Ready for a Brighter Smile?</h2>
        <p className="text-on-primary-container text-lg max-w-xl mx-auto">
          Schedule a consultation today and let our expert team design a personalized treatment plan for you.
        </p>
        <button className="btn-primary" onClick={() => setIsBookingOpen(true)}>Book Your Visit</button>
      </div>
    </div>
  </div>
);

const GalleryPage = () => {
  const images = [
    { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDp-lmJ34oGCE2dTdRbuI3BRryqs9tria5LW1URB607yj0J3WTmPdZ-OuzXCuokVJmxlhrzCLOtjwHWAlWUe1gYX9pFHq9xTxuhThw6c7c1gfLDIaIlhRLZqrq6H29YBfMcNxVFv0Tya8knB0B32jJindto7E-Apy-yvCtChwEare6GCnk0pWbxEPT6H8j1kxoJQpzDug19imr2spSj6x-rnxRwWmTYz3bn6c_dMHqoyeGhmT4ox6vmAgCTwjMziI_13Q5gDTGvOSgc", title: "Modern Operatory" },
    { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZGbjVqHRB_o9McXnLjI-BIpTFELmjirCc-iIhUWn-Ws15OsHyf_LjuxjseFyvj_43w_CoWjQiit8x2KdiQDQKGcEaD8h8Mr9C7TL-l7-TT7Ik-Vfo2N5OcBxVoMkpNy5mBVVucwkEQJH0Dl5YICEZB85ZOphSjI6EjLOthu0za9G1u9Nq8O2q-5N8HttilgX0GAHtlJbraDFRjtfhjElGinRkwpo5F5zqxTdeuaNaXdLs0CmX7FqmkL55ilIOlFZ909As_nEWZFDY", title: "Advanced Diagnostics" },
    { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD0OqPg3HyEguIZTPzKfWAiGVdcHC3-RvXfZIBuXatTbqLgHAtjo86CMkLzvqxs0WVvYUTiw-sUcOL9-tAlde3AFrFFQz2kpUbLiHKl6qjllbF1WdaF7QMRdRQpOHzku1z07W6O4sR290HJNMtze2VbSWAhSNbF4R5GewDuYz-ezonU_DhTl8m4oCunZ5XNl4xWeJkcRv2kGUCzDMGpeD8-SW5Kkuh4j-HF2sCyZ6nqJ-8uZxzblFfi7xdKWnRlFqx2Cj3VpMOEwqUX", title: "Patient Comfort" },
    { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDAUDzaRPVOjOTOhYq7TfhkknR6cIEiu26sIEmywQOOZRl2CcLAW1OzyCfIoNbm6j8khXI9GH-ltJalsPtELjezs5M1HT6fxW7vUKe_QX9DzrjZHrJogj8s5CQwqdMOyllTNDL09OkPsnjaTKEqmZCzlq0bcTBfd7zGp99rt7YpKQNuyJXw-PPmA_bWn7FMZMkpqHMFLK49nnZ0_pXclYff9giBZE4VpAJM3wStxcPzKmkg-dhx_vthYPpBA--ZEwidUg9JlwNp3TF1", title: "Specialized Lab" },
    { url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBEc8xW5QTXvyyjvruuEK4KLHBhJJbvlR1jAV_YMaiyirDlUUPtSB_ibMxR4DxpNJi3jK2yQA0lESa6CaPpkRgv7gusHDSHMklxizmzRmmkNfS0beshQyvCGw4RuNgcCj-Jy49hVFbjoUHtClYAGHeteGFDRyXi_CBIxAkaCV65fkF5uRmwU_7mFBvVe5CVYMS1Nhy3C0RlgCXVvudlabJDN-bNGMsTPg-708YkYlQux--id9_kHXaJePNB_a_s125B1HtbB3ywFpsP", title: "Dental Laboratory" }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 1000); // 1 sec auto slide
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="py-20 max-w-7xl mx-auto px-4 sm:px-6 min-h-[80vh] flex flex-col items-center">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-5xl font-bold text-primary">Smile Gallery</h1>
        <p className="text-lg text-primary/60">Take a virtual tour of our state-of-the-art dental facility.</p>
      </div>

      <div className="relative w-full max-w-4xl h-[500px] flex items-center justify-center perspective-1000 overflow-hidden">
        {images.map((img, i) => {
          let position = i - currentIndex;
          if (position < -2) position += images.length;
          if (position > 2) position -= images.length;

          const isActive = position === 0;
          
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{
                x: position * 300,
                scale: isActive ? 1.2 : 0.8,
                zIndex: isActive ? 10 : 5 - Math.abs(position),
                opacity: Math.abs(position) > 2 ? 0 : 1 - Math.abs(position) * 0.3,
                rotateY: position * -45,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute w-64 md:w-96 aspect-[3/4] rounded-2xl shadow-2xl overflow-hidden cursor-pointer"
              onClick={() => setCurrentIndex(i)}
            >
              <img 
                src={img.url} 
                alt={img.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white font-bold text-lg">{img.title}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <div className="glass-card p-8 rounded-2xl flex gap-6 items-center">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
             <ShieldCheck className="text-secondary" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Advanced Sterilization</h3>
            <p className="text-sm text-primary/70">Our lab maintains the highest standards of clinical hygiene and safety protocols.</p>
          </div>
        </div>
        <div className="glass-card p-8 rounded-2xl flex gap-6 items-center">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
             <Sparkles className="text-secondary" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Digital Workflow</h3>
            <p className="text-sm text-primary/70">Using 3D printing and intraoral scanning for precise and fast dental solutions.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    date: '',
    slot: '',
    message: ''
  });

  const ALL_SLOTS = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
    '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
    '07:00 PM', '07:30 PM'
  ];
  const availableSlots = ALL_SLOTS.filter(s => isSlotAvailable(s, formData.date));
  const clinicMapUrl = 'https://www.google.com/maps/place/SMILE+EZEE+DENTISTRY/@11.3335171,77.7045184,17z/data=!3m1!4b1!4m6!3m5!1s0x3ba96fd3ba0ee26b:0x1df1fbb5d93fc9e1!8m2!3d11.3335171!4d77.7045184!16s%2Fg%2F11hnwql5xr?entry=ttu';
  const clinicMapEmbedUrl = 'https://www.google.com/maps?q=SMILE%20EZEE%20DENTISTRY%2011.3335171,77.7045184&z=17&output=embed';

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      source: 'Contact Form'
    };
    
    // Sync to Google Sheet
    await syncToSheet(payload);

    const text = `*New Appointment Request*%0A*Name:* ${encodeURIComponent(formData.name)}%0A*Phone:* ${encodeURIComponent(formData.phone)}%0A*Email:* ${encodeURIComponent(formData.email)}%0A*Date:* ${encodeURIComponent(formData.date)}%0A*Slot:* ${encodeURIComponent(formData.slot)}%0A*Message:* ${encodeURIComponent(formData.message)}`;
    window.open(`https://wa.me/917010956291?text=${text}`, '_blank');
  };

  return (
    <div className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="max-w-3xl mb-16">
        <h1 className="text-5xl font-bold text-primary mb-6">We're here to help you smile.</h1>
        <p className="text-lg text-primary/70">
          Whether you have a question about our services, need to schedule a consultation, 
          or require immediate assistance, our team is ready to provide exceptional care.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        <div className="lg:col-span-7 glass-card p-6 md:p-10 rounded-2xl h-full">
          <h2 className="text-3xl font-bold mb-8">Service Request</h2>
          <form className="space-y-6" onSubmit={handleContactSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Full Name</label>
                <input 
                  required
                  type="text" 
                  placeholder="John Doe" 
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 outline-none focus:border-secondary transition-colors"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  placeholder="070109 56291" 
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 outline-none focus:border-secondary transition-colors"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Preferred Date</label>
                <input 
                  required
                  type="date" 
                  min={TODAY}
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 outline-none focus:border-secondary transition-colors"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value, slot: ''})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Preferred Slot</label>
                <select
                  required
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 outline-none focus:border-secondary transition-colors"
                  value={formData.slot}
                  onChange={e => setFormData({...formData, slot: e.target.value})}
                >
                  <option value="">
                    {!formData.date ? 'Select a date first' : availableSlots.length === 0 ? 'No slots available today' : 'Select a time'}
                  </option>
                  {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Email Address</label>
              <input 
                required
                type="email" 
                placeholder="john@example.com" 
                className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 outline-none focus:border-secondary transition-colors"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary/50">How can we help?</label>
              <textarea 
                required
                rows={5} 
                placeholder="Please describe your needs..." 
                className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 outline-none focus:border-secondary transition-colors resize-none"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>
            <div className="pt-4">
              <button type="submit" className="btn-primary w-full md:w-auto flex items-center gap-2 justify-center">
                Send Message <MessageCircle size={18} />
              </button>
            </div>
          </form>
        </div>

      <div className="lg:col-span-5 flex flex-col gap-6 h-full">
        <div className="glass-card p-6 md:p-8 rounded-2xl space-y-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-bold mb-1">Clinic Location</h3>
              <a
                href={clinicMapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary/70 leading-relaxed hover:text-secondary transition-colors"
              >
                9, Perundurai Rd, Teachers Colony,<br />Kumalan Kuttai, Erode, Tamil Nadu 638011
              </a>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
              <Phone size={18} />
            </div>
            <div>
              <h3 className="font-bold mb-1">Direct Line</h3>
              <p className="text-lg font-bold text-secondary">070109 56291</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 md:p-8 rounded-2xl">
          <h3 className="font-bold mb-6 flex items-center gap-2"><Clock size={18} /> Working Hours</h3>
          <ul className="space-y-4">
            <li className="flex justify-between text-sm">
              <span className="text-primary/70">Monday - Saturday</span>
              <span className="font-bold">9:30 AM - 8:00 PM</span>
            </li>
            <li className="flex justify-between text-sm">
              <span className="text-primary/70">Sunday</span>
              <span className="text-red-500 font-bold">Closed</span>
            </li>
          </ul>
        </div>

        <a
          href={clinicMapUrl}
          target="_blank"
          rel="noreferrer"
          className="block min-h-64 lg:min-h-0 lg:flex-1 rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30"
          aria-label="Open Smile Ezee Dentistry location in Google Maps"
        >
          <iframe
            src={clinicMapEmbedUrl}
            title="Smile Ezee Dentistry Google Map"
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </a>
      </div>
    </div>
  </div>
);
};

// --- Main App ---

const BookingModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (data: any) => void }) => {
  const emptyForm = { name: '', phone: '', appointmentType: '', dentalService: '', address: '', date: '', slot: '', issue: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableSlots = TIME_SLOTS.filter(s => isSlotAvailable(s, formData.date));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim())                          e.name = 'Full name is required';
    else if (!/^[a-zA-Z\s.''-]+$/.test(formData.name)) e.name = 'Name must contain letters only';
    if (!formData.phone.trim())                         e.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone))          e.phone = 'Enter a valid 10-digit number';
    if (!formData.appointmentType)                      e.appointmentType = 'Please select an appointment type';
    if (!formData.dentalService)                        e.dentalService = 'Please select a dental service';
    if (!formData.date)                                 e.date = 'Please select a preferred date';
    if (!formData.slot)                                 e.slot = 'Please select a time slot';
    if (!formData.address.trim())                       e.address = 'Address is required';
    return e;
  };

  const fc = (field: string) =>
    `w-full bg-surface-container border rounded-xl p-4 outline-none focus:ring-2 transition-all ${
      errors[field]
        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
        : 'border-outline-variant/30 focus:border-secondary focus:ring-secondary/20'
    }`;

  const Err = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠ {errors[field]}</p> : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    await syncToSheet({ ...formData, source: 'Booking Modal' });

    onConfirm({
      name: formData.name,
      phone: formData.phone,
      email: '', // Not in basic form but in type
      date: formData.date,
      slot: formData.slot,
      issue: formData.issue,
      address: formData.address,
      type: formData.appointmentType,
    });

    const d = formData;
    const msg = [
      `🦷 *SMILE EZEE DENTISTRY*`,
      `📋 *New Appointment Booking*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `👤 *Patient Name:*  ${d.name}`,
      `📱 *Phone / WhatsApp:*  ${d.phone}`,
      `🏥 *Appointment Type:*  ${d.appointmentType}`,
      `🦷 *Dental Service:*  ${d.dentalService}`,
      `📅 *Preferred Date:*  ${d.date}`,
      `⏰ *Time Slot:*  ${d.slot}`,
      `📍 *Address:*  ${d.address}`,
      d.issue ? `💬 *Notes:*  ${d.issue}` : '',
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `✅ Thank you for choosing Smile Ezee Dentistry!`,
      `We will confirm your appointment shortly. 😊`,
    ].filter(l => l !== undefined).join('\n');

    window.open(`https://wa.me/917010956291?text=${encodeURIComponent(msg)}`, '_blank');
    onClose();
    setFormData(emptyForm);
    setErrors({});
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto glass-card !bg-white/95"
          >
            <div className="p-6 md:p-10">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-primary">Book Appointment</h2>
                  <p className="text-primary/60 text-sm mt-1">All fields marked are required</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors"><X /></button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Full Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className={fc('name')}
                      value={formData.name}
                      onChange={e => {
                        const v = e.target.value.replace(/[^a-zA-Z\s.'''-]/g, '');
                        setFormData({...formData, name: v});
                        if (errors.name) setErrors({...errors, name: ''});
                      }}
                    />
                    <Err field="name" />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Phone / WhatsApp <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      placeholder="10-digit number"
                      maxLength={10}
                      className={fc('phone')}
                      value={formData.phone}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        setFormData({...formData, phone: v});
                        if (errors.phone) setErrors({...errors, phone: ''});
                      }}
                    />
                    <Err field="phone" />
                  </div>

                  {/* Appointment Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-primary/50">
                      Appointment Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      className={fc('appointmentType')}
                      value={formData.appointmentType}
                      onChange={e => { setFormData({...formData, appointmentType: e.target.value}); if (errors.appointmentType) setErrors({...errors, appointmentType: ''}); }}
                    >
                      <option value="">Select type</option>
                      {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Err field="appointmentType" />
                  </div>

                  {/* Dental Service */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-primary/50">
                      Dental Service <span className="text-red-400">*</span>
                    </label>
                    <select
                      className={fc('dentalService')}
                      value={formData.dentalService}
                      onChange={e => { setFormData({...formData, dentalService: e.target.value}); if (errors.dentalService) setErrors({...errors, dentalService: ''}); }}
                    >
                      <option value="">Select treatment</option>
                      {DENTAL_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Err field="dentalService" />
                  </div>

                  {/* Preferred Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Preferred Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      min={TODAY}
                      className={fc('date')}
                      value={formData.date}
                      onChange={e => { setFormData({...formData, date: e.target.value, slot: ''}); if (errors.date) setErrors({...errors, date: ''}); }}
                    />
                    <Err field="date" />
                  </div>

                  {/* Time Slot */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Select Time Slot <span className="text-red-400">*</span></label>
                    <select
                      className={fc('slot')}
                      value={formData.slot}
                      onChange={e => { setFormData({...formData, slot: e.target.value}); if (errors.slot) setErrors({...errors, slot: ''}); }}
                    >
                      <option value="">
                        {!formData.date ? 'Select a date first' : availableSlots.length === 0 ? 'No slots available today' : 'Select a time'}
                      </option>
                      {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Err field="slot" />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Address <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    placeholder="Your complete address"
                    className={fc('address')}
                    value={formData.address}
                    onChange={e => { setFormData({...formData, address: e.target.value}); if (errors.address) setErrors({...errors, address: ''}); }}
                  />
                  <Err field="address" />
                </div>

                {/* Comments (optional) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-primary/50">Comments / Issue Description</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe your concern (optional)..."
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-4 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all resize-none"
                    value={formData.issue}
                    onChange={e => setFormData({...formData, issue: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-secondary text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all"
                >
                  Confirm Booking <Calendar size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DoctorLogin = ({ setPage, setIsLoggedIn }: { setPage: (p: Page) => void, setIsLoggedIn: (l: boolean) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username === 'doctor' && password === '91234') {
      setIsLoggedIn(true);
      localStorage.setItem('doc_auth', 'true');
      setPage('dashboard');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 md:p-12 rounded-3xl w-full max-w-md"
      >
        <div className="text-center mb-10">
          <img src="https://i.postimg.cc/c434DgDB/smile-tranparaent.png" className="h-16 mx-auto mb-6" alt="Logo" />
          <h2 className="text-2xl font-bold">Doctor Login</h2>
          <p className="text-primary/50 text-sm mt-2">Access clinical dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-primary/50">Username</label>
            <input 
              type="text" 
              className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-4 outline-none focus:border-secondary transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-primary/50">Password</label>
            <input 
              type="password" 
              className="w-full bg-surface-container border border-outline-variant/30 rounded-xl p-4 outline-none focus:border-secondary transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full py-4 text-base">Explore Dashboard</button>
        </form>
      </motion.div>
    </div>
  );
};

const DoctorDashboard = ({ setPage, setIsLoggedIn, appointments }: { setPage: (p: Page) => void, setIsLoggedIn: (l: boolean) => void, appointments: AppointmentData[] }) => {
  const totalInvoiced = appointments.reduce((sum, app) => sum + app.billAmount, 0);
  const totalPaid = appointments.filter(a => a.paymentStatus === 'paid').reduce((sum, a) => sum + a.billAmount, 0);
  const totalUnpaid = totalInvoiced - totalPaid;

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('doc_auth');
    setPage('home');
  };

  const connectWhatsApp = (phone: string, name: string) => {
    const text = `Hello ${name}, this is Smile Ezee Dentistry. Regarding your appointment...`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="py-10 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            Clinical Dashboard <span className="bg-secondary/10 text-secondary text-xs px-3 py-1 rounded-full uppercase tracking-widest">Admin</span>
          </h1>
          <p className="text-primary/50 mt-1">Management overview for Smile Ezee Dentistry</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleLogout} className="btn-outline flex items-center gap-2 border-red-200 text-red-500 hover:bg-red-50">
            Logout <X size={18} />
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Appointments', value: appointments.length, icon: <Calendar /> },
          { label: 'Pending Visits', value: appointments.filter(a => a.status === 'pending').length, icon: <Clock /> },
          { label: 'Total Revenue', value: `₹${totalInvoiced.toLocaleString()}`, icon: <ShieldCheck /> },
          { label: 'Unpaid Balance', value: `₹${totalUnpaid.toLocaleString()}`, icon: <Mail className="text-red-400" /> }
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Appointment List Modern View */}
      <div className="glass-card rounded-3xl overflow-hidden border-none shadow-xl">
        <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/50">
          <h2 className="text-xl font-bold">Recent Appointments</h2>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-green-100 text-green-700 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Paid: ₹{totalPaid.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-red-100 text-red-700 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Due: ₹{totalUnpaid.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10 text-[10px] uppercase font-bold tracking-[0.15em] text-primary/40">
                <th className="px-8 py-5">Patient Details</th>
                <th className="px-8 py-5">Clinical Issue</th>
                <th className="px-8 py-5">Schedule</th>
                <th className="px-8 py-5">Billing</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {appointments.map((app) => (
                <tr key={app.id} className="hover:bg-surface transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary font-bold">
                        {app.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="font-bold text-primary">{app.name}</div>
                        <div className="text-xs text-primary/70 font-medium mt-0.5">{app.phone}</div>
                        <div className="text-[10px] text-primary/40 flex items-center gap-1 mt-1">
                          <MapPin size={8} /> {app.address}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 max-w-xs">
                    <div className="text-sm font-medium text-primary/80 line-clamp-2">{app.issue}</div>
                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-secondary/10 text-secondary rounded">
                      {app.type}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-primary">{app.date}</div>
                    <div className="text-xs text-primary/50 mt-1">{app.slot}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-bold text-primary">₹{app.billAmount.toLocaleString()}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${app.paymentStatus === 'paid' ? 'text-green-500' : 'text-red-500'}`}>
                      {app.paymentStatus}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => connectWhatsApp(app.phone, app.name)}
                        className="p-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="Contact via WhatsApp"
                      >
                        <MessageCircle size={20} />
                      </button>
                      <button className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {appointments.length === 0 && (
          <div className="p-20 text-center text-primary/30">
            <Calendar className="mx-auto mb-4 opacity-20" size={48} />
            <p>No appointments found in the system</p>
          </div>
        )}
      </div>
    </div>
  );
};

const WhatsAppChatWidget = ({ onConfirm }: { onConfirm: (data: any) => Promise<void> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState(0); // 0: Service list, 1: Name, 2: Phone, 3: Appt Type, 4: Date, 5: Slot, 6: Address, 7: Comments, 8: Summary/Send
  const [chatData, setChatData] = useState({
    service: "",
    name: "",
    phone: "",
    apptType: "New Consultation",
    date: "",
    slot: "",
    address: "",
    comments: ""
  });
  
  const phoneNumber = "7010956291";

  const handleServiceClick = (service: string) => {
    setChatData(prev => ({ ...prev, service }));
    setStep(1);
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => Math.max(0, prev - 1));

  const handleSend = async () => {
    setIsSending(true);
    try {
      const appData = {
        name: chatData.name,
        email: "", 
        phone: chatData.phone,
        type: chatData.apptType,
        issue: `${chatData.service}${chatData.comments ? ` - ${chatData.comments}` : ''}`,
        date: chatData.date,
        slot: chatData.slot,
        address: chatData.address,
      };

      // Also sync to Google Sheets for parity
      await syncToSheet({
        ...appData,
        appointmentType: chatData.apptType,
        dentalService: chatData.service,
        source: 'WhatsApp Chat'
      });

      // Save to Firebase
      await onConfirm(appData);

      const text = `*New Appointment Inquiry*
--------------------------
*Name:* ${chatData.name}
*Phone:* ${chatData.phone}
*Service:* ${chatData.service}
*Type:* ${chatData.apptType}
*Date:* ${chatData.date}
*Slot:* ${chatData.slot}
*Address:* ${chatData.address}
*Issue:* ${chatData.comments || 'N/A'}
--------------------------
_Sent from Website WhatsApp Chat_`;

      const message = encodeURIComponent(text);
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
      setIsOpen(false);
      resetChat();
    } catch (error) {
      console.error("Error saving inquiry:", error);
      // Still allow opening WhatsApp even if DB save fails
      const text = `*New Appointment Inquiry*
--------------------------
*Name:* ${chatData.name}
*Phone:* ${chatData.phone}
*Service:* ${chatData.service}
*Type:* ${chatData.apptType}
*Date:* ${chatData.date}
*Slot:* ${chatData.slot}
*Address:* ${chatData.address}
*Issue:* ${chatData.comments || 'N/A'}
--------------------------
_Sent from Website WhatsApp Chat_`;
      const message = encodeURIComponent(text);
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    } finally {
      setIsSending(false);
    }
  };

  const resetChat = () => {
    setStep(0);
    setChatData({
      service: "",
      name: "",
      phone: "",
      apptType: "New Consultation",
      date: "",
      slot: "",
      address: "",
      comments: ""
    });
  };

  const renderStep = () => {
    switch(step) {
      case 0:
        return (
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            <p className="text-[10px] text-primary/50 uppercase font-bold tracking-tight mb-1 px-1">Select Treatment</p>
            {DENTAL_SERVICES.map(service => (
              <button
                key={service}
                onClick={() => handleServiceClick(service)}
                className="w-full text-left p-3 rounded-xl bg-white/90 hover:bg-white text-[11px] font-bold text-[#075e54] border border-[#075e54]/5 hover:border-[#075e54]/20 hover:shadow-md transition-all flex items-center justify-between group"
              >
                {service}
                <ArrowRight size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        );
      case 1:
        return (
          <InputStep 
            label="FULL NAME *" 
            placeholder="John Doe" 
            value={chatData.name}
            onChange={v => setChatData(prev => ({...prev, name: v}))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <InputStep 
            label="PHONE / WHATSAPP *" 
            placeholder="10-digit number" 
            value={chatData.phone}
            onChange={v => setChatData(prev => ({...prev, phone: v}))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <SelectStep 
            label="APPOINTMENT *" 
            options={APPOINTMENT_TYPES}
            value={chatData.apptType}
            onChange={v => setChatData(prev => ({...prev, apptType: v}))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <DateStep 
            label="PREFERRED DATE *" 
            value={chatData.date}
            onChange={v => setChatData(prev => ({...prev, date: v}))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <SelectStep 
            label="SELECT TIME SLOT *" 
            options={TIME_SLOTS}
            value={chatData.slot}
            onChange={v => setChatData(prev => ({...prev, slot: v}))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 6:
        return (
          <InputStep 
            label="ADDRESS *" 
            placeholder="Your complete address" 
            value={chatData.address}
            onChange={v => setChatData(prev => ({...prev, address: v}))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 7:
        return (
          <TextAreaStep 
            label="COMMENTS / ISSUE DESCRIPTION" 
            placeholder="Briefly describe your concern (optional)..." 
            value={chatData.comments}
            onChange={v => setChatData(prev => ({...prev, comments: v}))}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 8:
        return (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm text-xs space-y-2 text-primary/70">
              <p className="font-bold text-[#075e54] border-b pb-1 mb-2">Booking Summary</p>
              <p><b>Name:</b> {chatData.name}</p>
              <p><b>Phone:</b> {chatData.phone}</p>
              <p><b>Service:</b> {chatData.service}</p>
              <p><b>Date:</b> {chatData.date} at {chatData.slot}</p>
            </div>
            <button 
              disabled={isSending}
              onClick={handleSend}
              className="w-full py-3 bg-[#25d366] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#128c7e] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSending ? "Saving..." : "Confirm & Send"} <MessageCircle size={18} />
            </button>
            <button onClick={prevStep} className="w-full text-xs text-primary/40 font-bold hover:text-primary transition-colors">Edit Details</button>
          </div>
        );
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/10"
          >
            {/* Header */}
            <div className="bg-[#075e54] p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                <img src="https://i.postimg.cc/c434DgDB/smile-tranparaent.png" alt="Logo" className="w-8 h-8 object-contain" />
              </div>
              <div className="text-white">
                <h3 className="font-bold text-sm">Smile Ezee Dentistry</h3>
                <p className="text-[10px] opacity-80">Online • Available 24*7</p>
              </div>
              <button onClick={() => { setIsOpen(false); resetChat(); }} className="ml-auto text-white/60 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="h-[480px] overflow-y-auto p-4 bg-[#f0f2f5] space-y-4 custom-scrollbar relative">
              <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[90%] text-[13px] text-primary/80">
                <p>Hello! 👋 How can we help you today?</p>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={step} 
                  initial={{ opacity: 0, x: 10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="pb-4"
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="p-2 bg-white/80 text-[9px] text-center text-primary/30 font-medium">
              Real-time booking via WhatsApp
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => { setIsOpen(!isOpen); if(!isOpen) resetChat(); }}
        className="w-14 h-14 rounded-full bg-[#25d366] text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative z-50 group"
      >
        <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
        {!isOpen && (
           <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </div>
  );
};

// --- Helper Components for Steps ---
const StepWrapper = ({ label, onBack, onNext, children, isNextDisabled }: any) => (
  <div className="bg-white p-4 rounded-xl rounded-tl-none shadow-sm space-y-3">
    <label className="text-[10px] font-bold uppercase tracking-widest text-[#075e54]/50">{label}</label>
    {children}
    <div className="flex gap-2 pt-1">
      <button onClick={onBack} className="flex-1 py-2.5 rounded-lg text-[11px] font-bold border border-outline-variant/20 text-primary/40 hover:bg-surface-container transition-colors">Back</button>
      <button 
        disabled={isNextDisabled}
        onClick={onNext} 
        className="flex-[2] py-2.5 bg-[#075e54] text-white rounded-lg text-[11px] font-bold shadow-md hover:bg-[#128c7e] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        Next <ArrowRight size={14} />
      </button>
    </div>
  </div>
);

const InputStep = ({ label, placeholder, value, onChange, onNext, onBack }: any) => (
  <StepWrapper label={label} onBack={onBack} onNext={onNext} isNextDisabled={!value.trim()}>
    <input 
      type="text" 
      autoFocus
      placeholder={placeholder}
      className="w-full p-3 rounded-xl border border-outline-variant/20 bg-surface-container/30 text-sm focus:outline-none focus:border-[#075e54] transition-all"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </StepWrapper>
);

const TextAreaStep = ({ label, placeholder, value, onChange, onNext, onBack }: any) => (
  <StepWrapper label={label} onBack={onBack} onNext={onNext}>
    <textarea 
      rows={3}
      autoFocus
      placeholder={placeholder}
      className="w-full p-3 rounded-xl border border-outline-variant/20 bg-surface-container/30 text-sm focus:outline-none focus:border-[#075e54] transition-all resize-none"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </StepWrapper>
);

const SelectStep = ({ label, options, value, onChange, onNext, onBack }: any) => (
  <StepWrapper label={label} onBack={onBack} onNext={onNext} isNextDisabled={!value}>
    <select
      className="w-full p-3 rounded-xl border border-outline-variant/20 bg-surface-container/30 text-sm focus:outline-none focus:border-[#075e54]"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">Select option</option>
      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
    </select>
  </StepWrapper>
);

const DateStep = ({ label, value, onChange, onNext, onBack }: any) => (
  <StepWrapper label={label} onBack={onBack} onNext={onNext} isNextDisabled={!value}>
    <input 
      type="date"
      className="w-full p-3 rounded-xl border border-outline-variant/20 bg-surface-container/30 text-sm focus:outline-none focus:border-[#075e54]"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </StepWrapper>
);

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    
    let unsubscribe: Unsubscribe;
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const apps = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AppointmentData[];
        setAppointments(apps);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'appointments');
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'appointments');
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const addAppointment = async (newApp: Omit<AppointmentData, 'id' | 'status' | 'paymentStatus' | 'billAmount'>) => {
    try {
      const appointment = {
        ...newApp,
        status: 'pending',
        paymentStatus: 'unpaid',
        billAmount: 1200,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'appointments'), appointment);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  useEffect(() => {
    const auth = localStorage.getItem('doc_auth');
    if (auth === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage setPage={setPage} setIsBookingOpen={setIsBookingOpen} />;
      case 'about': return <AboutPage />;
      case 'services': return <ServicesPage setIsBookingOpen={setIsBookingOpen} />;
      case 'gallery': return <GalleryPage />;
      case 'contact': return <ContactPage />;
      case 'doctor-login': return <DoctorLogin setPage={setPage} setIsLoggedIn={setIsLoggedIn} />;
      case 'dashboard': 
        if (!isLoggedIn) return <DoctorLogin setPage={setPage} setIsLoggedIn={setIsLoggedIn} />;
        return <DoctorDashboard setPage={setPage} setIsLoggedIn={setIsLoggedIn} appointments={appointments} />;
      default: return <HomePage setPage={setPage} setIsBookingOpen={setIsBookingOpen} />;
    }
  };

  const isDashboard = page === 'dashboard' || page === 'doctor-login';

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden">
      <nav className="fixed top-0 w-full z-50 bg-white border-b border-outline-variant/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setPage('home')}
          >
            <img 
              src="https://i.postimg.cc/c434DgDB/smile-tranparaent.png" 
              alt="Clinic Logo" 
              className="h-14 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="hidden md:flex gap-4 items-center">
            {isLoggedIn && (
               <button
                  onClick={() => setPage('dashboard')}
                  className={`nav-link ${page === 'dashboard' ? 'nav-link-active' : ''}`}
               >
                 Dashboard
               </button>
            )}
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About Us' },
              { id: 'services', label: 'Services' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'contact', label: 'Contact' },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => setPage(link.id as Page)}
                className={`nav-link ${page === link.id ? 'nav-link-active' : ''}`}
              >
                {link.label}
              </button>
            ))}
            {!isDashboard && <button onClick={() => setIsBookingOpen(true)} className="btn-primary ml-4">Book Appointment</button>}
            <button 
              onClick={() => setPage(isLoggedIn ? 'dashboard' : 'doctor-login')} 
              className={`p-2.5 rounded-full transition-all duration-200 ml-2 ${page === 'doctor-login' || page === 'dashboard' ? 'bg-secondary text-white' : 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-white'}`}
              title={isLoggedIn ? 'Clinical Dashboard' : 'Doctor Access'}
            >
              <UserCog size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => {
                setPage(isLoggedIn ? 'dashboard' : 'doctor-login');
                setIsMobileMenuOpen(false);
              }}
              className={`p-2 rounded-full transition-colors ${page === 'doctor-login' || page === 'dashboard' ? 'bg-secondary/10 text-secondary' : 'text-primary'}`}
            >
              <UserCog size={20} />
            </button>
            <button className="text-primary p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
               {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {!isDashboard && (
          <div className="bg-secondary text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 text-center text-xs sm:text-sm font-semibold tracking-wide">
              India’s No.1 Diamond Invisalign Provider (2020-2025)*
            </div>
          </div>
        )}

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-outline-variant/10 overflow-hidden"
            >
              <div className="flex flex-col p-4 gap-2">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'about', label: 'About Us' },
                  { id: 'services', label: 'Services' },
                  { id: 'gallery', label: 'Gallery' },
                  { id: 'contact', label: 'Contact' },
                ].map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      setPage(link.id as Page);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-left py-3 px-4 rounded-xl font-medium transition-colors ${
                      page === link.id ? 'bg-secondary/10 text-secondary' : 'text-primary/70 hover:bg-surface'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setIsBookingOpen(true);
                    setIsMobileMenuOpen(false);
                  }} 
                  className="btn-primary mt-2 w-full text-center"
                >
                  Book Appointment
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      
      <main className="flex-grow pt-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer setPage={setPage} />

      <WhatsAppChatWidget onConfirm={addAppointment} />

      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
        onConfirm={addAppointment}
      />

      {/* FAB - Moved slightly to avoid WhatsApp button overlap if needed */}
      <button 
        onClick={() => setIsBookingOpen(true)}
        className="fixed bottom-24 right-8 w-14 h-14 rounded-full bg-secondary text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Calendar size={24} />
      </button>
    </div>
  );
}
