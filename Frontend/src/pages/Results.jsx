import { useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import ResultCard from '../components/quiz/ResultCard';
import { quizApi } from '../api/quiz.api';
import './DoshaQuiz.css'; // Reusing styles and adding new ones

const getExplanation = (categoryKey, dosha) => {
  const explanations = {
    physical: {
      Vata: "Your body structure is naturally trim and light, with a tendency to feel cold easily and dry skin. Energy comes in bursts.",
      Pitta: "You have a medium, warm, and athletic build. Your system generates heat naturally, and you likely maintain your weight with ease.",
      Kapha: "You have a sturdy, strong, and well-lubricated body frame. Your energy is slow and steady, with wonderful endurance and soft, smooth skin."
    },
    metabolism: {
      Vata: "Your digestion and appetite can be quite variable and occasionally delicate. You may sometimes forget to eat or experience occasional bloating.",
      Pitta: "You have a very strong and fast digestion. Missing meals might make you irritable, and your body processes most foods efficiently.",
      Kapha: "Your digestion tends to be slow and steady. You can likely skip meals without much discomfort but may feel heavy after large meals."
    },
    mental: {
      Vata: "Your mind is creative, quick, and highly active, though it can become anxious or overwhelmed under stress. You are a light sleeper.",
      Pitta: "You possess sharp focus, intellect, and ambition. When stressed, you may lean towards frustration or irritability. You make clear decisions.",
      Kapha: "You are emotionally steady, calm, and nurturing. Under stress, you might withdraw. You enjoy deep, sound sleep and stable routines."
    }
  };
  return explanations[categoryKey]?.[dosha] || "A beautifully balanced nature.";
};

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [results, setResults] = useState(location.state?.results || null);
  const [loading, setLoading] = useState(!location.state?.results);

  useEffect(() => {
    if (!results) {
      quizApi.getLatestResult()
        .then(res => {
          setResults(res.result);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          navigate('/dosha-quiz', { replace: true });
        });
    }
  }, [results, navigate]);

  if (loading) {
    return (
      <AnimatedPage>
        <div className="results-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Loading results...</h2>
        </div>
      </AnimatedPage>
    );
  }

  if (!results) {
    return null;
  }

  const resultData = [
    {
      title: "Physical Characteristics",
      key: "physical",
      dosha: results.physical,
      delay: 0.1
    },
    {
      title: "Metabolism & Digestion",
      key: "metabolism",
      dosha: results.metabolism,
      delay: 0.2
    },
    {
      title: "Mental & Emotional",
      key: "mental",
      dosha: results.mental,
      delay: 0.3
    }
  ];

  return (
    <AnimatedPage>
      <div className="results-page">
        <div className="results-container">
          
          <div className="results-header">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="results-title"
            >
              Your Ayurvedic Analysis
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="results-subtitle"
            >
              Based on your answers, here is a breakdown of your prominent doshas across different aspects of your mind and body.
            </motion.p>
          </div>

          <div className="results-grid">
            {resultData.map((data) => (
              <ResultCard 
                key={data.key}
                title={data.title}
                dominantDosha={data.dosha}
                explanation={getExplanation(data.key, data.dosha)}
                delay={data.delay}
              />
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="results-actions"
          >
            <Link to="/dashboard" className="btn btn--primary btn--lg results-btn">
              Continue to Dashboard <ArrowRight size={18} />
            </Link>
            
            <Link to="/dosha-quiz" className="btn btn--outline btn--lg results-btn">
              <RotateCcw size={18} /> Retake Quiz
            </Link>
          </motion.div>

        </div>
      </div>
    </AnimatedPage>
  );
}
