import { motion } from 'framer-motion';

export default function QuestionCard({ question, selectedOption, onSelect }) {
  const doshaColors = {
    Vata: 'var(--vata)',
    Pitta: 'var(--pitta)',
    Kapha: 'var(--kapha)'
  };

  return (
    <div className="quiz-card__body">
      <h2 className="quiz-card__question">{question.question}</h2>
      <p className="quiz-card__description">{question.description}</p>

      <div className="quiz-card__options">
        {question.options.map((opt, i) => {
          const isSelected = selectedOption === opt.dosha;
          
          return (
            <motion.button
              key={i}
              onClick={() => onSelect(opt.dosha)}
              className={`quiz-option ${isSelected ? 'quiz-option--selected' : ''}`}
              style={{
                '--dosha-color': doshaColors[opt.dosha]
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="quiz-option__border" />
              <div className="quiz-option__label" style={{ backgroundColor: isSelected ? doshaColors[opt.dosha] : '' }}>
                {opt.label}
              </div>
              <span className="quiz-option__text">
                {opt.text}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
