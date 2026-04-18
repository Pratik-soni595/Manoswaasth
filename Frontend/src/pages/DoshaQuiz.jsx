/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import { getFlatQuestions } from '../data/quizData';
import { quizApi } from '../api/quiz.api';
import ProgressBar from '../components/quiz/ProgressBar';
import QuestionCard from '../components/quiz/QuestionCard';
import './DoshaQuiz.css';

const questions = getFlatQuestions();

const questionVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] } },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0, transition: { duration: 0.3 } }),
};

export default function DoshaQuiz() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (dosha) => {
    if (isSubmitting) return;
    
    const qId = questions[currentIdx].id;
    const newAnswers = { ...answers, [qId]: dosha };
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setDirection(1);
      setCurrentIdx(currentIdx + 1);
    } else {
      calculateResults(newAnswers);
    }
  };

  const calculateResults = async (finalAnswers) => {
    setIsSubmitting(true);
    try {
      const answerPayload = Object.entries(finalAnswers).map(([questionId, selectedDosha]) => ({
        questionId,
        selectedDosha
      }));
      
      const res = await quizApi.submitQuiz(answerPayload);
      
      navigate('/results', { state: { results: res.result } });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error submitting quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setDirection(-1);
      setCurrentIdx(currentIdx - 1);
    }
  };

  const currentQ = questions[currentIdx];

  return (
    <AnimatedPage>
      <div className="quiz-page">
        <div className="quiz-page__header">
          <Link to="/" className="quiz-page__back">
            <ChevronLeft size={18} /> Back to Home
          </Link>
        </div>

        <motion.div
          className="quiz-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="quiz-card__top">
            <div className="quiz-card__icon">
              <Compass size={26} />
            </div>
            <h1 className="quiz-card__title">Discover Your Dosha</h1>
            
            <ProgressBar 
              currentStep={currentIdx} 
              totalSteps={questions.length} 
              categoryName={currentQ.categoryName} 
            />
          </div>

          <div className="quiz-card__slider overflow-hidden relative">
            <AnimatePresence mode="wait" custom={direction}>
              {questions.map((q, idx) => {
                if (idx !== currentIdx) return null;
                return (
                  <motion.div
                    key={q.id}
                    custom={direction}
                    variants={questionVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="w-full"
                  >
                    <QuestionCard 
                      question={q}
                      selectedOption={answers[q.id]}
                      onSelect={handleSelect}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="quiz-card__nav">
            <button
              className="btn btn--outline"
              onClick={handlePrev}
              disabled={currentIdx === 0}
            >
              <ChevronLeft size={16} /> Previous
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
