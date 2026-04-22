import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Wind, TreeDeciduous, Compass, BarChart3, Sun, Moon,
  BookOpen, Sparkles, ArrowRight, Leaf, Heart, Frown, Meh, Smile
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import AnimatedPage from '../components/AnimatedPage';
import ScrollReveal from '../components/ScrollReveal';
import { dashboardApi } from '../api/dashboard.api';
import './Dashboard.css';

const breathingExercises = [
  { name: 'Box Breathing', pattern: '4-4-4-4', icon: '□', desc: 'Immediate stress relief' },
  { name: '4-7-8 Breathing', pattern: '4-7-8', icon: '◯', desc: 'Nervous system tranquilizer' },
  { name: 'Nadi Shodhana', pattern: '5-2-5', icon: '∞', desc: 'Brain hemisphere balancing' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] } },
};

export default function Dashboard() {
  const [profile, setProfile] = useState({ name: 'User', primaryDosha: 'Unknown' });
  const [sattvaPoints, setSattvaPoints] = useState(0);
  const [moodHistory, setMoodHistory] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [routine, setRoutine] = useState({ morning: [], evening: [] });
  const [latestJournal, setLatestJournal] = useState(null);
  const [activeBreathing, setActiveBreathing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isSavingMood, setIsSavingMood] = useState(false);

  const fetchOverview = async () => {
    try {
      const data = await dashboardApi.getOverview();
      setProfile(data.profile);
      setSattvaPoints(data.sattvaPoints);
      
      const formattedMoods = (data.recentMoods || []).map(m => {
        const d = new Date(m.loggedAt);
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        return { day: days[d.getDay()], mood: m.moodScore };
      }).reverse();
      
      setMoodHistory(formattedMoods.length ? formattedMoods : [{ day: 'Today', mood: 0 }]);
      setSelectedMood(data.latestMood?.moodScore || null);
      setLatestJournal(data.latestJournal);
      setRoutine(data.routine);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleLogMood = async (level) => {
    setIsSavingMood(true);
    try {
      const res = await dashboardApi.addMoodLog(level, 'Logged from dashboard');
      setSelectedMood(level);
      setSattvaPoints(res.totalPoints);
      fetchOverview();
    } catch (err) {
      alert(err.message || 'Failed to log mood');
    } finally {
      setIsSavingMood(false);
    }
  };

  const hasRoutine = Boolean(routine?.morning?.length || routine?.evening?.length);

  const treeStage = sattvaPoints >= 100 ? <TreeDeciduous size={28} /> : sattvaPoints >= 50 ? <TreeDeciduous size={24} /> : sattvaPoints >= 20 ? <Leaf size={24} /> : <Leaf size={18} />;
  const treeName = sattvaPoints >= 100 ? 'Flourishing Banyan' : sattvaPoints >= 50 ? 'Young Tree' : sattvaPoints >= 20 ? 'Sprout' : 'Seedling';

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <h2>Loading Dashboard...</h2>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="dashboard">
        <div className="dashboard__header">
          <div>
            <h1 className="dashboard__greeting">Welcome, {profile.name}</h1>
            <p className="dashboard__subtitle">Your personalized wellness command center</p>
          </div>
        </div>

        <motion.div
          className="dashboard__grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Widget 1 — Profile */}
          <motion.div className="widget widget--profile" variants={itemVariants}>
            <div className="widget__header">
              <Compass size={18} />
              <h3>Your Profile</h3>
            </div>
            <div className="profile-content">
              <div className="profile-avatar">P</div>
              <div className="profile-info">
                <span className="profile-name">{profile.name}</span>
                <span className="profile-dosha-badge">
                  {profile.primaryDosha && profile.primaryDosha !== 'Unknown' ? (
                    <Link to="/results" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {profile.primaryDosha === 'Vata' && <Wind size={14} />}
                      {profile.primaryDosha === 'Pitta' && <Flame size={14} />}
                      {profile.primaryDosha === 'Kapha' && <Leaf size={14} />}
                      {profile.primaryDosha}
                    </Link>
                  ) : (
                    <Link to="/dosha-quiz" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Take Quiz <ArrowRight size={14} />
                    </Link>
                  )}
                </span>
              </div>
            </div>
            <div className="sattva-section">
              <div className="sattva-tree">
                <motion.span
                  className="sattva-tree__icon"
                  key={sattvaPoints}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.4 }}
                >
                  {treeStage}
                </motion.span>
                <span className="sattva-tree__name">{treeName}</span>
              </div>
              <div className="sattva-points">
                <TreeDeciduous size={14} />
                <span>{sattvaPoints} Sattva Points</span>
              </div>
            </div>
            <Link to="/dosha-quiz" className="widget__link">
              Retake Quiz <ArrowRight size={14} />
            </Link>
          </motion.div>

          {/* Widget 2 — Mood Tracker */}
          <motion.div className="widget widget--mood" variants={itemVariants}>
            <div className="widget__header">
              <BarChart3 size={18} />
              <h3>Mood Tracker</h3>
              <span className="widget__badge">+5 pts</span>
            </div>
            <div className="mood-buttons">
              {[
                { icon: <Frown size={24} />, label: 'Low', value: 2 },
                { icon: <Meh size={24} />, label: 'Neutral', value: 3 },
                { icon: <Smile size={24} />, label: 'Great', value: 5 },
              ].map((m) => (
                <motion.button
                  key={m.value}
                  className={`mood-btn ${selectedMood === m.value ? 'mood-btn--active' : ''}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleLogMood(m.value)}
                  disabled={isSavingMood}
                >
                  <span className="mood-btn__icon">{m.icon}</span>
                  <span className="mood-btn__label">{m.label}</span>
                </motion.button>
              ))}
            </div>
            <div className="mood-chart">
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={moodHistory}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 5]} hide />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #E2D9CC', borderRadius: 8, fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="#2C5F4E"
                    strokeWidth={2}
                    dot={{ fill: '#D4AF37', r: 4, strokeWidth: 0 }}
                    activeDot={{ fill: '#2C5F4E', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Widget 3 — Routine Builder */}
          <motion.div className="widget widget--routine" variants={itemVariants}>
            <div className="widget__header">
              <Sun size={18} />
              <h3>Dinacharya — Daily Routine</h3>
            </div>
            
            {hasRoutine ? (
              <>
                {routine.morning?.length > 0 && (
                  <div className="routine-section">
                    <h4 className="routine-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Sun size={16} /> Morning · {routine.morning.length} items</h4>
                    <div className="routine-items">
                      {routine.morning.map((r) => (
                        <div key={r} className="ritual-pill">{r}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {routine.evening?.length > 0 && (
                  <div className="routine-section">
                    <h4 className="routine-label" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Moon size={16} /> Evening · {routine.evening.length} items</h4>
                    <div className="routine-items">
                      {routine.evening.map((r) => (
                        <div key={r} className="ritual-pill">{r}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                <Link to="/routine-builder" className="widget__link" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Edit Routine <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <div className="routine-empty-state">
                <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Create Your Dinacharya</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
                  A consistent morning and evening routine helps regulate energy, improve focus, and support deeper rest. Start with a few simple rituals and build gradually.
                </p>
                <Link to="/routine-builder" style={{ textDecoration: 'none' }}>
                  <motion.button
                    className="btn btn--primary btn--sm widget__save-btn"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{ margin: 0 }}
                  >
                    Build My Routine
                  </motion.button>
                </Link>
              </div>
            )}
          </motion.div>

          {/* Widget 4 — AI Companion Mini */}
          <motion.div className="widget widget--companion" variants={itemVariants}>
            <div className="widget__header">
              <Sparkles size={18} />
              <h3>AI Wellness Companion</h3>
            </div>
            <div className="companion-preview">
              <div className="companion-msg">
                <div className="companion-msg__avatar"><Leaf size={12} /></div>
                <p>Remember to take your evening walk today — it's a wonderful way to cool Pitta energy before sunset.</p>
              </div>
            </div>
            <Link to="/chat" className="widget__link">
              Open Full Chat <ArrowRight size={14} />
            </Link>
          </motion.div>

          {/* Widget 5 — Breathing */}
          <motion.div className="widget widget--breathing" variants={itemVariants}>
            <div className="widget__header">
              <Wind size={18} />
              <h3>Pranayama Practice</h3>
            </div>
            <div className="breathing-cards">
              {breathingExercises.map((ex) => (
                <motion.button
                  key={ex.name}
                  className={`breathing-card ${activeBreathing === ex.name ? 'breathing-card--active' : ''}`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveBreathing(activeBreathing === ex.name ? null : ex.name)}
                >
                  <span className="breathing-card__icon">{ex.icon}</span>
                  <span className="breathing-card__name">{ex.name}</span>
                  <span className="breathing-card__pattern">{ex.pattern}</span>
                  <span className="breathing-card__desc">{ex.desc}</span>
                </motion.button>
              ))}
            </div>
            {activeBreathing && (
              <motion.div
                className="breathing-active"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <motion.div
                  className="breathing-circle"
                  animate={{ scale: [1, 1.4, 1.4, 1] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="breathing-label">Breathe with the circle</span>
              </motion.div>
            )}
          </motion.div>

          {/* Widget 6 — Reflection Journal */}
          <motion.div className="widget widget--journal" variants={itemVariants}>
            <div className="widget__header">
              <BookOpen size={18} />
              <h3>Reflection Journal</h3>
            </div>
            
            <div className="journal-preview">
              {latestJournal ? (
                <>
                  <div className="journal-latest" style={{ marginBottom: '16px' }}>
                    <span className={`journal-guna-badge journal-guna-badge--${latestJournal.gunaTag?.toLowerCase() || 'sattvic'}`}>
                      {latestJournal.gunaTag || 'Sattvic'} ✦
                    </span>
                    <p className="journal-excerpt" style={{ color: 'var(--text-primary)' }}>"{latestJournal.content}"</p>
                  </div>
                  <Link to="/reflection-journal" className="widget__link" style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Open Journal <ArrowRight size={14} />
                  </Link>
                </>
              ) : (
                <div className="journal-empty-state">
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Begin Your Reflection Practice</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
                    Journaling helps you process emotions, track patterns, and build clarity over time. Even a few lines each day can improve self-awareness and mental balance.
                  </p>
                  <Link to="/reflection-journal" style={{ textDecoration: 'none' }}>
                    <motion.button
                      className="btn btn--primary btn--sm widget__save-btn"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ margin: 0 }}
                    >
                      Start Reflection Journal
                    </motion.button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
