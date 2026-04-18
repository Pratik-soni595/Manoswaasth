import { motion } from 'framer-motion';

const doshaInfo = {
  Vata: {
    color: 'var(--vata)',
    bg: 'var(--vata-light)',
    emoji: '🌬️'
  },
  Pitta: {
    color: 'var(--pitta)',
    bg: 'var(--pitta-light)',
    emoji: '🔥'
  },
  Kapha: {
    color: 'var(--kapha)',
    bg: 'var(--kapha-light)',
    emoji: '🌍'
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
          {info.emoji}
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
