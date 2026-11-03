import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Clock,
  Coffee,
  Home as HomeIcon,
  Sunrise,
  AlertCircle,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck,
  ListPlus,
} from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import { dashboardApi } from '../api/dashboard.api';
import { dincharyaApi } from '../api/dincharya.api';
import './RoutineBuilder.css';

const CATEGORY_META = {
  after_waking: {
    label: 'After Waking Up',
    icon: Sunrise,
    pillClass: 'pill--sunrise',
    timeHint: 'Early morning ritual upon rising',
  },
  work_break: {
    label: 'During Work Break',
    icon: Coffee,
    pillClass: 'pill--break',
    timeHint: 'Midday pause to reset energy',
  },
  after_work: {
    label: 'After Returning Home',
    icon: HomeIcon,
    pillClass: 'pill--home',
    timeHint: 'Transition ritual to release workday tension',
  },
  before_bed: {
    label: 'Before Going to Bed',
    icon: Moon,
    pillClass: 'pill--bed',
    timeHint: 'Evening wind-down for deep restorative sleep',
  },
};

const CATEGORY_ORDER = ['after_waking', 'work_break', 'after_work', 'before_bed'];

export default function RoutineBuilder() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active view tab: 'recommendations' or 'manual'
  const initialTab = searchParams.get('tab') === 'manual' ? 'manual' : 'recommendations';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Manual routine builder state
  const [morning, setMorning] = useState(['']);
  const [evening, setEvening] = useState(['']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [applyMessage, setApplyMessage] = useState(null);

  // Dincharya recommendation form state
  const [schedule, setSchedule] = useState({
    break_start: '13:00',
    break_end: '13:15',
    return_home_time: '18:30',
    sleep_time: '23:00',
    wake_time: '06:30',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [recError, setRecError] = useState(null);
  const [isAssessmentMissing, setIsAssessmentMissing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

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

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams(newTab === 'manual' ? { tab: 'manual' } : {});
    setApplyMessage(null);
  };

  // Schedule input change handler
  const handleScheduleChange = (field, value) => {
    setSchedule((prev) => ({ ...prev, [field]: value }));
  };

  // Request Dincharya recommendations from Node API
  const handleGenerateRecommendations = async (e) => {
    if (e) e.preventDefault();
    setRecError(null);
    setIsAssessmentMissing(false);

    // Frontend validation: check all fields
    const { break_start, break_end, return_home_time, sleep_time, wake_time } = schedule;
    if (!break_start || !break_end || !return_home_time || !sleep_time || !wake_time) {
      setRecError('Please provide all five daily schedule times.');
      return;
    }

    // Break ordering check
    const [bsh, bsm] = break_start.split(':').map(Number);
    const [beh, bem] = break_end.split(':').map(Number);
    if (beh * 60 + bem <= bsh * 60 + bsm) {
      setRecError('Work break end time must be later than start time. Breaks cannot cross midnight.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await dincharyaApi.getRecommendations(schedule);
      if (response && response.recommendations) {
        setRecommendations(response.recommendations);
        setModelInfo(response.model || null);
      } else {
        throw new Error('Received incomplete recommendation data.');
      }
    } catch (err) {
      const msg = err.message || 'Failed to fetch recommendations. Please try again.';
      setRecError(msg);
      if (
        msg.toLowerCase().includes('assessment') ||
        msg.toLowerCase().includes('dosha') ||
        msg.toLowerCase().includes('quiz')
      ) {
        setIsAssessmentMissing(true);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Explicit user action to copy recommendations into manual routine builder
  const handleApplyToRoutine = () => {
    if (!recommendations) return;

    const wakingTitle = recommendations.after_waking?.title;
    const breakTitle = recommendations.work_break?.title;
    const afterWorkTitle = recommendations.after_work?.title;
    const beforeBedTitle = recommendations.before_bed?.title;

    const newMorning = [...morning.filter(Boolean)];
    if (wakingTitle && !newMorning.includes(wakingTitle)) newMorning.push(wakingTitle);
    if (breakTitle && !newMorning.includes(breakTitle)) newMorning.push(breakTitle);

    const newEvening = [...evening.filter(Boolean)];
    if (afterWorkTitle && !newEvening.includes(afterWorkTitle)) newEvening.push(afterWorkTitle);
    if (beforeBedTitle && !newEvening.includes(beforeBedTitle)) newEvening.push(beforeBedTitle);

    setMorning(newMorning.length ? newMorning : ['']);
    setEvening(newEvening.length ? newEvening : ['']);
    setActiveTab('manual');
    setSearchParams({ tab: 'manual' });
    setApplyMessage('Recommended rituals added to your draft routine! Review and click Save Routine below.');
  };

  // Manual routine helpers
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
    const trimmedMorning = morning.map((item) => item.trim()).filter(Boolean);
    const trimmedEvening = evening.map((item) => item.trim()).filter(Boolean);

    if (trimmedMorning.length === 0 && trimmedEvening.length === 0) {
      setError('Please add at least one routine item before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await dashboardApi.saveRoutine({
        morning: trimmedMorning,
        evening: trimmedEvening,
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
        <div
          className="routine-builder"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
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
          className="routine-back-btn"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="routine-builder__header">
          <h1 className="routine-builder__title">Daily Dinacharya</h1>
          <p className="routine-builder__subtitle">
            Harmonize your daily rituals with your Ayurvedic constitution (Prakriti) and modern schedule.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="routine-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recommendations'}
            className={`routine-tab-btn ${activeTab === 'recommendations' ? 'routine-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('recommendations')}
          >
            <Sparkles size={16} /> Personalized Recommendations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manual'}
            className={`routine-tab-btn ${activeTab === 'manual' ? 'routine-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('manual')}
          >
            <ListPlus size={16} /> My Custom Routine
          </button>
        </div>

        {/* Tab 1: Personalized Dincharya Recommendations */}
        {activeTab === 'recommendations' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="recommendations-container"
          >
            <div className="schedule-form-card">
              <div className="schedule-form-card__header">
                <div className="schedule-form-card__badge">
                  <Clock size={16} /> Schedule Inputs
                </div>
                <h2>Plan Around Your Workday</h2>
                <p>
                  Enter your typical working hours and sleep times. The recommendation engine evaluates your
                  dosha affinities against your time budgets to suggest four balanced rituals.
                </p>
              </div>

              <form onSubmit={handleGenerateRecommendations} className="schedule-form">
                <div className="schedule-form__grid">
                  <div className="form-group">
                    <label htmlFor="break_start">
                      Work Break Start <span className="required-star">*</span>
                    </label>
                    <input
                      id="break_start"
                      type="time"
                      value={schedule.break_start}
                      onChange={(e) => handleScheduleChange('break_start', e.target.value)}
                      required
                      className="time-input"
                    />
                    <span className="field-hint">e.g. 13:00</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="break_end">
                      Work Break End <span className="required-star">*</span>
                    </label>
                    <input
                      id="break_end"
                      type="time"
                      value={schedule.break_end}
                      onChange={(e) => handleScheduleChange('break_end', e.target.value)}
                      required
                      className="time-input"
                    />
                    <span className="field-hint">Must be after start</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="return_home_time">
                      Return Home Time <span className="required-star">*</span>
                    </label>
                    <input
                      id="return_home_time"
                      type="time"
                      value={schedule.return_home_time}
                      onChange={(e) => handleScheduleChange('return_home_time', e.target.value)}
                      required
                      className="time-input"
                    />
                    <span className="field-hint">Arrival at home</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="sleep_time">
                      Target Bedtime <span className="required-star">*</span>
                    </label>
                    <input
                      id="sleep_time"
                      type="time"
                      value={schedule.sleep_time}
                      onChange={(e) => handleScheduleChange('sleep_time', e.target.value)}
                      required
                      className="time-input"
                    />
                    <span className="field-hint">e.g. 23:00</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="wake_time">
                      Wake-Up Time <span className="required-star">*</span>
                    </label>
                    <input
                      id="wake_time"
                      type="time"
                      value={schedule.wake_time}
                      onChange={(e) => handleScheduleChange('wake_time', e.target.value)}
                      required
                      className="time-input"
                    />
                    <span className="field-hint">e.g. 06:30</span>
                  </div>
                </div>

                <div className="disclaimer-banner">
                  <ShieldCheck size={16} />
                  <span>
                    These suggested activities are wellness micro-rituals adapted from traditional Dinacharya
                    principles. They are optional lifestyle practices and do not constitute clinical or
                    medical advice.
                  </span>
                </div>

                {recError && isAssessmentMissing && (
                  <div className="quiz-required-card">
                    <div className="quiz-required-card__icon">
                      <Compass size={24} />
                    </div>
                    <div className="quiz-required-card__text">
                      <h3>Prakriti Assessment Required</h3>
                      <p>
                        We could not find a completed Dosha assessment on your profile. Complete the 5-minute
                        quiz so we can tailor rituals to your constitution.
                      </p>
                      <Link to="/dosha-quiz" className="btn-quiz-link">
                        Take Dosha Quiz <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                )}

                {recError && !isAssessmentMissing && (
                  <div className="routine-error-banner" role="alert">
                    <AlertCircle size={18} />
                    <span>{recError}</span>
                  </div>
                )}

                <div className="schedule-form__actions">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="btn-generate"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles size={16} className="spin-icon" /> Generating Rituals...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Generate Recommendations
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Recommendations Display */}
            {recommendations && (
              <div className="recommendations-results">
                <div className="recommendations-results__header">
                  <div>
                    <h2 className="recommendations-results__title">Your Recommended Daily Dinacharya</h2>
                    <p className="recommendations-results__subtitle">
                      Four micro-rituals tailored to your Ayurvedic constitution and schedule budget.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyToRoutine}
                    className="btn-apply-routine"
                  >
                    <ListPlus size={16} /> Apply to My Routine
                  </button>
                </div>

                <div className="recommendations-grid">
                  {CATEGORY_ORDER.map((catKey) => {
                    const task = recommendations[catKey];
                    if (!task) return null;
                    const meta = CATEGORY_META[catKey];
                    const IconComp = meta?.icon || Sparkles;

                    return (
                      <div key={catKey} className="recommendation-card">
                        <div className="recommendation-card__top">
                          <span className={`category-pill ${meta?.pillClass || ''}`}>
                            <IconComp size={14} /> {meta?.label || catKey}
                          </span>
                          <span className="duration-pill">
                            <Clock size={12} /> {task.duration_minutes} min
                          </span>
                        </div>

                        <h3 className="recommendation-card__title">{task.title}</h3>
                        <p className="recommendation-card__desc">{task.description}</p>

                        {task.ayurvedic_principle && (
                          <div className="recommendation-card__principle">
                            <Sparkles size={14} className="principle-sparkle" />
                            <div>
                              <strong>Ayurvedic Principle:</strong> {task.ayurvedic_principle}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {modelInfo && (
                  <div className="model-footnote">
                    <span>
                      Engine: {modelInfo.name || 'Random Forest'} • {modelInfo.note}
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 2: Manual Routine Builder (Existing Functionality Preserved) */}
        {activeTab === 'manual' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {applyMessage && (
              <div className="routine-success-banner" role="status">
                <CheckCircle2 size={18} />
                <span>{applyMessage}</span>
              </div>
            )}

            {error && (
              <div className="routine-error-banner" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="routine-card">
              <div className="routine-card__header">
                <h2 className="routine-card__title">
                  <Sun size={18} /> Morning Routine
                </h2>
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
                        aria-label={`Morning ritual ${index + 1}`}
                      />
                      <button
                        type="button"
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
                type="button"
                onClick={() => handleAddField('morning')}
                className="routine-add-btn"
              >
                <Plus size={16} /> Add Morning Ritual
              </button>
            </div>

            <div className="routine-card">
              <div className="routine-card__header">
                <h2 className="routine-card__title">
                  <Moon size={18} /> Evening Routine
                </h2>
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
                        aria-label={`Evening ritual ${index + 1}`}
                      />
                      <button
                        type="button"
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
                type="button"
                onClick={() => handleAddField('evening')}
                className="routine-add-btn"
              >
                <Plus size={16} /> Add Evening Ritual
              </button>
            </div>

            <div className="routine-builder__actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate('/dashboard')}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Routine'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatedPage>
  );
}
