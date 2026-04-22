/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion';
import { Compass, Sparkles, Sun, ArrowRight, ChevronRight, Star, Leaf, Quote, TreeDeciduous } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import ScrollReveal from '../components/ScrollReveal';
import './Home.css';

const features = [
  {
    icon: <Compass size={28} />,
    title: 'Dosha Assessment',
    desc: 'Discover your unique mind-body constitution through an ancient Ayurvedic questionnaire refined for the modern world.',
    color: 'var(--secondary)',
    path: '/dosha-quiz',
  },
  {
    icon: <Sparkles size={28} />,
    title: 'AI Wellness Companion',
    desc: 'Receive personalized Ayurvedic guidance from an intelligent companion trained in holistic wellness traditions.',
    color: 'var(--primary)',
    path: '/chat',
  },
  {
    icon: <Sun size={28} />,
    title: 'Daily Rituals (Dinacharya)',
    desc: 'Build morning and evening routines rooted in Ayurveda to bring harmony, energy, and balance to your days.',
    color: 'var(--pitta)',
    path: '/dashboard',
  },
];

const steps = [
  { num: '01', title: 'Take the Quiz', desc: 'Answer 5 mindful questions about your body, mind, and habits.' },
  { num: '02', title: 'Get Your Profile', desc: 'Discover your dosha — Vata, Pitta, or Kapha — and what it means.' },
  { num: '03', title: 'Transform Your Life', desc: 'Follow personalized rituals, foods, and practices tailored to you.' },
];

const floatingVariants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
  },
};

const floatingVariants2 = {
  animate: {
    y: [0, 8, 0],
    rotate: [0, 5, 0],
    transition: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
  },
};

export default function Home() {
  return (
    <AnimatedPage>
      <div className="home">
        {/* Hero */}
        <section className="hero">
          <div className="hero__bg-shapes">
            <motion.div className="hero__circle hero__circle--1" variants={floatingVariants} animate="animate" />
            <motion.div className="hero__circle hero__circle--2" variants={floatingVariants2} animate="animate" />
            <motion.div className="hero__circle hero__circle--3" variants={floatingVariants} animate="animate" />
          </div>

          <div className="hero__content">
            <div className="hero__text">
              <motion.div
                className="hero__badge"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Star size={14} />
                <span>Ancient Wisdom, Modern Wellness</span>
              </motion.div>

              <motion.h1
                className="hero__title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: [0, 0, 0.2, 1] }}
              >
                Discover Your <br />
                <span className="hero__title-accent">Inner Harmony</span>
              </motion.h1>

              <motion.p
                className="hero__subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6 }}
              >
                An Ayurveda-inspired, AI-assisted wellness platform tailored to your daily routine, mental patterns, and eating habits.
              </motion.p>

              <motion.div
                className="hero__actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <Link to="/dosha-quiz">
                  <motion.button
                    className="btn btn--primary btn--lg"
                    whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(44, 95, 78, 0.35)' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Begin Your Journey
                    <ArrowRight size={18} />
                  </motion.button>
                </Link>
                <Link to="/dashboard">
                  <motion.button
                    className="btn btn--outline btn--lg"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Explore Dashboard
                  </motion.button>
                </Link>
              </motion.div>
            </div>

            <motion.div
              className="hero__visual"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0, 0, 0.2, 1] }}
            >
              <div className="hero__mandala">
                <motion.div
                  className="hero__mandala-ring hero__mandala-ring--outer"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="hero__mandala-ring hero__mandala-ring--middle"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
                />
                <div className="hero__mandala-center">
                  <Leaf size={42} />
                </div>
              </div>
              <motion.div className="hero__float-leaf hero__float-leaf--1" variants={floatingVariants} animate="animate"><Leaf size={24} /></motion.div>
              <motion.div className="hero__float-leaf hero__float-leaf--2" variants={floatingVariants2} animate="animate"><TreeDeciduous size={24} /></motion.div>
              <motion.div className="hero__float-leaf hero__float-leaf--3" variants={floatingVariants} animate="animate"><Sparkles size={24} /></motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="features">
          <ScrollReveal>
            <div className="section-header">
              <span className="section-tag">What We Offer</span>
              <h2 className="section-title">Ancient Practices, <span className="text-accent">Reimagined</span></h2>
              <p className="section-subtitle">Three pillars of personalized Ayurvedic wellness, powered by modern AI.</p>
            </div>
          </ScrollReveal>

          <div className="features__grid">
            {features.map((feature, i) => (
              <ScrollReveal key={i} delay={i * 0.12}>
                <Link to={feature.path} style={{ display: 'block', textDecoration: 'none', outline: 'none' }} className="feature-card-link">
                  <motion.div
                    className="feature-card"
                    whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  >
                    <div className="feature-card__icon" style={{ '--accent': feature.color }}>
                      {feature.icon}
                    </div>
                    <h3 className="feature-card__title" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
                    <p className="feature-card__desc">{feature.desc}</p>
                    <div className="feature-card__link">
                      Learn more <ChevronRight size={16} />
                    </div>
                  </motion.div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="how-it-works">
          <ScrollReveal>
            <div className="section-header">
              <span className="section-tag">Simple Process</span>
              <h2 className="section-title">Your Path to <span className="text-accent">Wellness</span></h2>
            </div>
          </ScrollReveal>

          <div className="steps">
            {steps.map((step, i) => (
              <ScrollReveal key={i} delay={i * 0.15}>
                <div className="step">
                  <div className="step__number">{step.num}</div>
                  <div className="step__connector" />
                  <h3 className="step__title">{step.title}</h3>
                  <p className="step__desc">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Wisdom Quote */}
        <section className="wisdom">
          <ScrollReveal>
            <div className="wisdom__card">
              <Quote size={32} className="wisdom__icon" />
              <blockquote className="wisdom__quote">
                "When diet is wrong, medicine is of no use. When diet is correct, medicine is of no need."
              </blockquote>
              <cite className="wisdom__author">— Ayurvedic Proverb</cite>
            </div>
          </ScrollReveal>
        </section>


        {/* Final CTA */}
        <section className="final-cta">
          <ScrollReveal>
            <div className="final-cta__content">
              <h2 className="final-cta__title">Begin Your Wellness Journey Today</h2>
              <p className="final-cta__subtitle">Take the first step towards balance, harmony, and vitality.</p>
              <Link to="/dosha-quiz">
                <motion.button
                  className="btn btn--primary btn--lg final-cta__btn"
                  whileHover={{ scale: 1.03, boxShadow: '0 8px 25px rgba(44, 95, 78, 0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start Free Assessment
                  <ArrowRight size={18} />
                </motion.button>
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer__inner">
            <div className="footer__brand">
              <Leaf size={18} />
              <span>Manoswaasth</span>
            </div>
            <p className="footer__copy">© 2026 Manoswaasth. Rooted in ancient wisdom.</p>
            <div className="footer__links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </AnimatedPage>
  );
}
