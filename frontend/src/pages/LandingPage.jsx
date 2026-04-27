/**
 * @fileoverview Public landing page for KituiRides.
 */
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBell,
  FiCheckCircle,
  FiHeadphones,
  FiMapPin,
  FiMenu,
  FiShield,
  FiUsers
} from "react-icons/fi";
import { FaApple, FaCarSide, FaGooglePlay, FaMotorcycle } from "react-icons/fa";

const navigationItems = [
  { label: "Home", href: "#home", active: true },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Safety", href: "#safety" },
  { label: "About Us", href: "#about-us" },
  { label: "Contact", href: "#contact" }
];

const featureHighlights = [
  {
    title: "Safe & Secure",
    description: "Verified drivers and secure trips",
    icon: FiShield
  },
  {
    title: "Affordable",
    description: "Fair prices for every journey",
    icon: FiCheckCircle
  },
  {
    title: "24/7 Support",
    description: "We're here for you anytime",
    icon: FiHeadphones
  }
];

const heroStats = [
  {
    label: "10K+",
    description: "Happy Riders",
    icon: FiUsers
  },
  {
    label: "2K+",
    description: "Active Drivers",
    icon: FaCarSide
  },
  {
    label: "100%",
    description: "Safe & Trusted",
    icon: FiShield
  },
  {
    label: "24/7",
    description: "Always Available",
    icon: FiMapPin
  }
];

const journeySteps = [
  {
    title: "Request a Ride",
    description: "Set your pickup and destination in a few taps, then choose the ride option that fits your trip best."
  },
  {
    title: "Get Matched Fast",
    description: "Nearby drivers receive the request instantly so you get reliable pickup times around Kitui town."
  },
  {
    title: "Move with Confidence",
    description: "Track the trip, stay in touch, and complete payment in one smooth experience from request to dropoff."
  }
];

const safetyPoints = [
  "Driver accounts are verified before they go live on the platform.",
  "Trip details stay visible end to end, with clear support escalation paths.",
  "Pricing stays transparent across car and motorcycle options."
];

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="KituiRides home">
      <div className="relative h-14 w-11 shrink-0">
        <div className="absolute inset-x-0 top-0 h-10 rounded-full bg-[#19a44a]" />
        <div className="absolute left-1/2 top-6 h-5 w-5 -translate-x-1/2 rotate-45 bg-[#19a44a]" />
        <div className="absolute inset-x-0 top-0 flex h-10 items-center justify-center text-lg text-white">
          <FaCarSide aria-hidden="true" />
        </div>
      </div>
      <div className="flex items-baseline gap-0.5 text-[2.15rem] font-semibold leading-none tracking-normal">
        <span className="text-[#111827]">Kitui</span>
        <span className="text-[#19a44a]">Rides</span>
      </div>
    </Link>
  );
}

function StoreBadge({ platform, label, sublabel, icon: Icon }) {
  return (
    <Link
      to="/register"
      className="inline-flex min-w-[162px] items-center gap-3 rounded-xl bg-black px-4 py-3 text-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5"
    >
      <Icon className="text-2xl" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block text-[0.68rem] font-medium uppercase tracking-[0.16em] text-white/72">{label}</span>
        <span className="block text-lg font-semibold">{sublabel}</span>
      </span>
      <span className="sr-only">{platform}</span>
    </Link>
  );
}

function FeatureHighlight({ title, description, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-lg text-[#19a44a]">
        <Icon aria-hidden="true" />
      </div>
      <div>
        <p className="text-[1.35rem] font-semibold text-[#111827]">{title}</p>
        <p className="mt-1 max-w-[12rem] text-base leading-8 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function HeroStat({ label, description, icon: Icon, last }) {
  return (
    <div className={`flex items-center gap-5 px-5 py-3 ${last ? "" : "border-b border-slate-200/80 pb-6 md:border-b-0 md:border-r md:pb-3"}`}>
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[1.9rem] text-[#19a44a]">
        <Icon aria-hidden="true" />
      </div>
      <div>
        <p className="text-[2rem] font-semibold leading-none text-[#111827]">{label}</p>
        <p className="mt-2 text-xl text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function PhoneRideMockup() {
  return (
    <div className="relative w-[274px] rounded-[3rem] bg-[#111111] p-[6px] shadow-[0_38px_90px_-34px_rgba(15,23,42,0.55)] sm:w-[314px] lg:w-[304px] xl:w-[324px]">
      <div className="overflow-hidden rounded-[2.65rem] border border-white/55 bg-[#f7f7f5]">
        <div className="relative mx-auto mt-2.5 h-6.5 w-28 rounded-full bg-[#09090b]">
          <div className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#12253f]" />
        </div>

        <div className="px-4 pb-4 pt-3 sm:px-[1.1rem]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/88 text-slate-500 shadow-sm"
              aria-label="Open menu"
            >
              <FiMenu />
            </button>
            <p className="text-[1.28rem] font-semibold text-[#111827]">Where to?</p>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/88 text-slate-500 shadow-sm"
              aria-label="Notifications"
            >
              <FiBell />
            </button>
          </div>

          <div
            className="relative mt-3.5 h-[220px] overflow-hidden rounded-[1.8rem] bg-[#efefec] sm:h-[246px]"
            style={{
              backgroundImage: [
                "linear-gradient(114deg, transparent 0%, transparent 38%, rgba(255,255,255,0.9) 38.8%, rgba(255,255,255,0.9) 40.4%, transparent 41.2%, transparent 100%)",
                "linear-gradient(76deg, transparent 0%, transparent 48%, rgba(255,255,255,0.88) 49%, rgba(255,255,255,0.88) 50.4%, transparent 51.2%, transparent 100%)",
                "linear-gradient(16deg, transparent 0%, transparent 54%, rgba(255,255,255,0.86) 54.7%, rgba(255,255,255,0.86) 55.8%, transparent 56.6%, transparent 100%)",
                "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)"
              ].join(", ")
            }}
          >
            <svg viewBox="0 0 320 285" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M267 63C249 73 240 80 218 87C183 98 155 108 142 129C131 147 131 159 122 169C104 189 91 193 84 216" fill="none" stroke="#18a44b" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
            <div className="absolute right-7 top-[3.1rem] h-4.5 w-4.5 rounded-full border-[3px] border-white bg-[#1ab14c]" />
            <div className="absolute left-[3.8rem] top-[9.5rem] flex h-12 w-7 rotate-[14deg] items-center justify-center rounded-[0.85rem] bg-white shadow-[0_10px_20px_-10px_rgba(15,23,42,0.35)]">
              <FaCarSide className="text-base text-[#111827]" />
            </div>
          </div>

          <div className="mt-3.5 rounded-[1.65rem] bg-white/92 px-4 py-3.5 shadow-[0_24px_40px_-34px_rgba(15,23,42,0.4)] backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-3 rounded-full bg-[#19a44a]" />
              <div>
                <p className="text-sm text-slate-500">Pickup location</p>
                <p className="mt-1 text-base text-slate-700">Enter pickup location</p>
              </div>
            </div>

            <div className="my-3.5 h-px bg-slate-200" />

            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-3 rounded-full bg-[#ff7a1a]" />
              <div>
                <p className="text-sm text-slate-500">Dropoff location</p>
                <p className="mt-1 text-base text-slate-700">Where are you going?</p>
              </div>
            </div>
          </div>

          <div className="mt-3.5 rounded-[1.65rem] bg-white px-4 py-3.5 shadow-[0_24px_40px_-34px_rgba(15,23,42,0.4)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FaCarSide className="text-lg text-[#111827]" />
                <div>
                  <p className="font-semibold text-[#111827]">Car</p>
                  <p className="text-sm text-slate-500">1-4 seats</p>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600">KES 200-350</p>
            </div>

            <div className="my-3.5 h-px bg-slate-200" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FaMotorcycle className="text-lg text-[#111827]" />
                <div>
                  <p className="font-semibold text-[#111827]">Motorcycle</p>
                  <p className="text-sm text-slate-500">1 seat</p>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-600">KES 100-180</p>
            </div>

            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#21a84c] px-4 py-3 text-lg font-semibold text-white shadow-[0_18px_35px_-26px_rgba(33,168,76,0.95)]"
            >
              Find Ride
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-[#f7faf7] text-[#111827]">
      <section
        id="home"
        className="relative overflow-hidden bg-[linear-gradient(135deg,#fbfcfa_0%,#f3f9f6_42%,#eef5fb_76%,#fff6ea_100%)]"
      >
        <div className="absolute inset-0">
          <div className="absolute left-[-5%] top-16 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="absolute right-[-3%] top-10 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-100/50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1520px] px-6 pb-12 pt-6 sm:px-8 lg:px-10 xl:px-16">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <BrandMark />

            <nav className="hidden items-center gap-12 lg:flex" aria-label="Primary navigation">
              {navigationItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`relative pb-3 text-[1.08rem] font-medium transition ${
                    item.active ? "text-[#159c45]" : "text-[#111827] hover:text-[#159c45]"
                  }`}
                >
                  {item.label}
                  {item.active ? (
                    <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#19a44a]" />
                  ) : null}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="inline-flex min-h-[3.35rem] items-center justify-center rounded-2xl bg-white px-8 text-[1.08rem] font-medium text-[#111827] shadow-[0_18px_35px_-26px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="inline-flex min-h-[3.35rem] items-center justify-center rounded-2xl bg-[#21a84c] px-8 text-[1.08rem] font-medium text-white shadow-[0_18px_35px_-26px_rgba(33,168,76,0.85)] transition hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </div>
          </header>

          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center xl:mt-10">
            <div className="relative z-20 max-w-[36rem] pt-4 lg:pb-16 lg:pt-12 xl:pt-16">
              <p className="text-[2rem] font-medium text-[#159c45] sm:text-[2.15rem]">Move. Connect. Thrive.</p>
              <h1 className="mt-4 text-[4.5rem] font-semibold leading-[0.95] text-[#0b1116] sm:text-[5.4rem] xl:text-[6.2rem]">
                <span className="block">Your Ride,</span>
                <span className="mt-2 block text-[#18a44b]">Your Town.</span>
              </h1>
              <p className="mt-8 max-w-[31rem] text-[1.2rem] leading-10 text-slate-600 sm:text-[1.25rem]">
                KituiRides connects you to safe, reliable, and affordable rides around Kitui town. Anytime, anywhere.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/register?role=CUSTOMER"
                  className="inline-flex min-h-[3.65rem] items-center justify-center gap-3 rounded-2xl bg-[#21a84c] px-8 text-[1.18rem] font-medium text-white shadow-[0_20px_42px_-30px_rgba(33,168,76,0.9)] transition hover:-translate-y-0.5"
                >
                  <span>Request a Ride</span>
                  <FiArrowRight aria-hidden="true" />
                </Link>
                <Link
                  to="/register?role=DRIVER"
                  className="inline-flex min-h-[3.65rem] items-center justify-center rounded-2xl border border-slate-300/80 bg-white/92 px-8 text-[1.18rem] font-medium text-[#111827] shadow-[0_20px_42px_-34px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5"
                >
                  Become a Driver
                </Link>
              </div>

              <div className="mt-12 grid gap-8 sm:grid-cols-3">
                {featureHighlights.map((feature) => (
                  <FeatureHighlight key={feature.title} {...feature} />
                ))}
              </div>

              <div className="mt-12 flex flex-wrap gap-4">
                <StoreBadge
                  platform="Google Play"
                  label="Get it on"
                  sublabel="Google Play"
                  icon={FaGooglePlay}
                />
                <StoreBadge
                  platform="App Store"
                  label="Download on the"
                  sublabel="App Store"
                  icon={FaApple}
                />
              </div>
            </div>

            <div className="relative min-h-[540px] lg:min-h-[780px]">
              <div className="absolute inset-0 overflow-hidden rounded-[3rem] bg-slate-200 lg:rounded-none">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('/landing/kituirides-hero-scene.png')" }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)]" />
                <div className="absolute -left-[22%] top-1/2 hidden h-[125%] w-[56%] -translate-y-1/2 rounded-full bg-[#fbfcfa] shadow-[26px_0_80px_-48px_rgba(15,23,42,0.28)] lg:block" />
                <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#fbfcfa] to-transparent lg:hidden" />
              </div>

              <div className="absolute bottom-4 right-2 sm:right-6 lg:bottom-8 lg:right-0 xl:right-6">
                <PhoneRideMockup />
              </div>
            </div>
          </div>

          <div className="relative z-30 mt-6 sm:mt-10 lg:-mt-8 xl:-mt-2">
            <div className="mx-auto max-w-[1010px] rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_36px_70px_-46px_rgba(15,23,42,0.38)] backdrop-blur md:p-7">
              <div className="grid gap-1 md:grid-cols-4">
                {heroStats.map((stat, index) => (
                  <HeroStat
                    key={stat.label}
                    label={stat.label}
                    description={stat.description}
                    icon={stat.icon}
                    last={index === heroStats.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#19a44a]">How It Works</p>
            <h2 className="mt-4 text-4xl font-semibold text-[#111827]">A simple ride flow built for everyday movement around Kitui.</h2>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {journeySteps.map((step, index) => (
              <div key={step.title} className="rounded-[1.75rem] border border-slate-200 bg-[#f8fbf9] p-8 shadow-[0_24px_50px_-44px_rgba(15,23,42,0.35)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#19a44a]">Step {index + 1}</p>
                <h3 className="mt-4 text-2xl font-semibold text-[#111827]">{step.title}</h3>
                <p className="mt-4 text-lg leading-8 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="safety" className="bg-[#f4faf6]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-8 lg:grid-cols-[1.05fr,0.95fr] lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#19a44a]">Safety</p>
            <h2 className="mt-4 text-4xl font-semibold text-[#111827]">Reliable journeys start with trusted drivers and visible support.</h2>
            <div className="mt-8 space-y-5">
              {safetyPoints.map((point) => (
                <div key={point} className="flex items-start gap-4">
                  <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-[#19a44a]">
                    <FiShield aria-hidden="true" />
                  </div>
                  <p className="text-lg leading-8 text-slate-600">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_36px_70px_-46px_rgba(15,23,42,0.38)]">
            <div
              className="h-[18rem] bg-cover bg-center"
              style={{ backgroundImage: "url('/landing/kituirides-hero-scene.png')" }}
            />
            <div className="space-y-4 p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#19a44a]">KituiRides Promise</p>
              <p className="text-2xl font-semibold text-[#111827]">Safe, reliable, and affordable rides around Kitui town.</p>
              <p className="text-lg leading-8 text-slate-600">
                Every trip experience in the platform is designed to feel local, dependable, and easy to trust from the first request to the final dropoff.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about-us" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.95fr,1.05fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#19a44a]">About Us</p>
              <h2 className="mt-4 text-4xl font-semibold text-[#111827]">Built for local movement, daily errands, and dependable town travel.</h2>
            </div>
            <div className="space-y-5 text-lg leading-8 text-slate-600">
              <p>
                KituiRides is shaped around the rhythm of Kitui town: quick pickups, familiar roads, flexible vehicle options, and support that feels close at hand.
              </p>
              <p>
                Whether you need a ride across town, a motorcycle for a shorter hop, or an income path as a driver, the platform is built to keep movement simple and accessible.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-[#111827]">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-20 text-white sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Contact</p>
            <h2 className="mt-4 text-4xl font-semibold">Ready to move with KituiRides?</h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Sign up as a customer or driver and get started with the same calm, modern experience shown on the landing page.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/login"
              className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl border border-white/20 bg-white/6 px-7 text-base font-medium text-white transition hover:bg-white/12"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="inline-flex min-h-[3.5rem] items-center justify-center rounded-2xl bg-[#21a84c] px-7 text-base font-medium text-white shadow-[0_20px_42px_-30px_rgba(33,168,76,0.9)] transition hover:-translate-y-0.5"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
