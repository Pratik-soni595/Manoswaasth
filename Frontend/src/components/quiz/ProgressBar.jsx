import { motion } from 'framer-motion';

export default function ProgressBar({ currentStep, totalSteps, categoryName }) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="quiz-progress-container mb-6">
      <div className="quiz-progress-header">
        <div>
          <p className="quiz-progress-step">
            Question {currentStep + 1} of {totalSteps}
          </p>
          <h3 className="quiz-progress-category">{categoryName}</h3>
        </div>
        <span className="quiz-progress-percentage">{Math.round(progress)}%</span>
      </div>
      <div className="quiz-progress-track">
        <motion.div
          className="quiz-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
