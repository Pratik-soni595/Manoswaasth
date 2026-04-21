import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import { dashboardApi } from '../api/dashboard.api';
import './RoutineBuilder.css';

export default function RoutineBuilder() {
  const navigate = useNavigate();
  const [morning, setMorning] = useState(['']);
  const [evening, setEvening] = useState(['']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoutine = async () => {
      try {
        const data = await dashboardApi.getOverview();
        if (data.routine) {
          if (data.routine.morning && data.routine.morning.length > 0) {
            setMorning(data.routine.morning);
          }
          if (data.routine.evening && data.routine.evening.length > 0) {
            setEvening(data.routine.evening);
          }
        }
      } catch (err) {
        console.error('Failed to fetch routine:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoutine();
  }, []);

  const handleAddField = (timeOfDay) => {
    if (timeOfDay === 'morning') {
      setMorning([...morning, '']);
    } else {
      setEvening([...evening, '']);
    }
  };

  const handleRemoveField = (timeOfDay, index) => {
    if (timeOfDay === 'morning') {
      const newArray = morning.filter((_, i) => i !== index);
      setMorning(newArray.length ? newArray : ['']);
    } else {
      const newArray = evening.filter((_, i) => i !== index);
      setEvening(newArray.length ? newArray : ['']);
    }
  };

  const handleChange = (timeOfDay, index, value) => {
    if (timeOfDay === 'morning') {
      const newArray = [...morning];
      newArray[index] = value;
      setMorning(newArray);
    } else {
      const newArray = [...evening];
      newArray[index] = value;
      setEvening(newArray);
    }
  };

  const handleSave = async () => {
    setError(null);
    const trimmedMorning = morning.map(item => item.trim()).filter(Boolean);
    const trimmedEvening = evening.map(item => item.trim()).filter(Boolean);

    if (trimmedMorning.length === 0 && trimmedEvening.length === 0) {
      setError('Please add at least one routine item before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await dashboardApi.saveRoutine({
        morning: trimmedMorning,
        evening: trimmedEvening
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to save routine. Please try again.');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="routine-builder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Loading your routine...</h2>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="routine-builder">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="routine-add-btn" 
          style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="routine-builder__header">
          <h1 className="routine-builder__title">Create Your Dinacharya</h1>
          <p className="routine-builder__subtitle">
            A consistent morning and evening routine helps regulate energy, improve focus, and support deeper rest. Start with a few simple rituals and build gradually.
          </p>
        </div>

        {error && (
          <div style={{ color: 'var(--error)', background: 'rgba(229,62,62,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="routine-card">
          <div className="routine-card__header">
            <h2 className="routine-card__title">Morning Routine</h2>
          </div>
          <div className="routine-list">
            <AnimatePresence>
              {morning.map((item, index) => (
                <motion.div 
                  key={`morning-${index}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="routine-item"
                >
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleChange('morning', index, e.target.value)}
                    placeholder="e.g. Scrape tongue and drink warm water"
                    className="routine-item__input"
                  />
                  <button 
                    onClick={() => handleRemoveField('morning', index)}
                    className="routine-item__remove"
                    aria-label="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => handleAddField('morning')}
            className="routine-add-btn"
          >
            <Plus size={16} /> Add Morning Ritual
          </button>
        </div>

        <div className="routine-card">
          <div className="routine-card__header">
            <h2 className="routine-card__title">Evening Routine</h2>
          </div>
          <div className="routine-list">
            <AnimatePresence>
              {evening.map((item, index) => (
                <motion.div 
                  key={`evening-${index}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="routine-item"
                >
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => handleChange('evening', index, e.target.value)}
                    placeholder="e.g. Turn off screens by 9 PM"
                    className="routine-item__input"
                  />
                  <button 
                    onClick={() => handleRemoveField('evening', index)}
                    className="routine-item__remove"
                    aria-label="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => handleAddField('evening')}
            className="routine-add-btn"
          >
            <Plus size={16} /> Add Evening Ritual
          </button>
        </div>

        <div className="routine-builder__actions">
          <button 
            className="btn-cancel"
            onClick={() => navigate('/dashboard')}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            className="btn-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Routine'}
          </button>
        </div>
      </div>
    </AnimatedPage>
  );
}
