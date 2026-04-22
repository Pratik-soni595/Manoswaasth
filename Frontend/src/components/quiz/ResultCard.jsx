import { motion } from 'framer-motion';
import { Wind, Flame, Globe } from 'lucide-react';

const doshaInfo = {
  Vata: {
    color: 'var(--vata)',
    bg: 'var(--vata-light)',
    icon: <Wind size={24} />
  },
  Pitta: {
    color: 'var(--pitta)',
    bg: 'var(--pitta-light)',
    icon: <Flame size={24} />
  },
  Kapha: {
    color: 'var(--kapha)',
    bg: 'var(--kapha-light)',
    icon: <Globe size={24} />
  }
};

export default function ResultCard({ title, dominantDosha, explanation, delay = 0 }) {
  const info = doshaInfo[dominantDosha] || doshaInfo.Vata;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="result-category-card"
    >
      <div className="result-category-card__header">
        <h3 className="result-category-card__title">{title}</h3>
        <div 
          className="result-category-card__icon"
          style={{ backgroundColor: info.bg }}
        >
          {info.icon}
        </div>
      </div>
      
      <div className="result-category-card__content">
        <span className="result-category-card__label">Dominant Dosha</span>
        <h4 
          className="result-category-card__dosha"
          style={{ color: info.color }}
        >
          {dominantDosha}
        </h4>
      </div>
      
      <p className="result-category-card__desc">
        {explanation}
      </p>
    </motion.div>
  );
}
