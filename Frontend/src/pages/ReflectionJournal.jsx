import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import { dashboardApi } from '../api/dashboard.api';
import './ReflectionJournal.css';

const GUNA_OPTIONS = [
  { id: 'Sattvic', label: 'Sattvic (Calm, Clear)' },
  { id: 'Rajasic', label: 'Rajasic (Active, Restless)' },
  { id: 'Tamasic', label: 'Tamasic (Dull, Heavy)' }
];

export default function ReflectionJournal() {
  const navigate = useNavigate();
  const [latestJournal, setLatestJournal] = useState(null);
  const [journalEntry, setJournalEntry] = useState('');
  const [gunaTag, setGunaTag] = useState('Sattvic');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const fetchOverview = async () => {
    try {
      const data = await dashboardApi.getOverview();
      if (data.latestJournal) {
        setLatestJournal(data.latestJournal);
      }
    } catch (err) {
      console.error('Failed to fetch latest journal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSaveJournal = async () => {
    if (!journalEntry.trim()) {
      setError('Please write something before saving.');
      return;
    }
    
    setError(null);
    setIsSaving(true);
    setSuccess(false);
    
    try {
      await dashboardApi.saveJournalEntry(journalEntry.trim(), gunaTag);
      setSuccess(true);
      setJournalEntry('');
      await fetchOverview(); // Refresh the latest entry display
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save journal entry.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="reflection-journal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Loading journal...</h2>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <div className="reflection-journal">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn-nav-back"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="reflection-journal__header">
          <BookOpen size={32} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <h1 className="reflection-journal__title">Reflection Journal</h1>
          <p className="reflection-journal__subtitle">
            Journaling helps you process emotions, track patterns, and build clarity over time. 
            Even a few lines each day can improve self-awareness and mental balance.
          </p>
        </div>

        {error && (
          <div style={{ color: 'var(--error)', background: 'rgba(229,62,62,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ color: 'var(--success)', background: 'rgba(56,161,105,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
            Journal entry saved successfully! (+ points)
          </div>
        )}

        <div className="journal-card">
          <div className="journal-card__header">
            <h2 className="journal-card__title">Write a New Entry</h2>
          </div>
          
          <div className="journal-input-area">
            <div className="guna-selector">
              {GUNA_OPTIONS.map(option => (
                <button
                  key={option.id}
                  className={`guna-btn ${gunaTag === option.id ? 'active' : ''}`}
                  onClick={() => setGunaTag(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            <textarea
              className="journal-textarea"
              placeholder="How are you feeling today? What happened?"
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
            />
          </div>

          <div className="reflection-journal__actions">
            <button 
              className="btn-save"
              onClick={handleSaveJournal}
              disabled={isSaving || !journalEntry.trim()}
            >
              {isSaving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

        {latestJournal && (
          <div className="journal-card">
            <div className="journal-card__header">
              <h2 className="journal-card__title">Latest Entry</h2>
            </div>
            <div className="journal-latest-entry">
              <span className={`journal-guna-badge journal-guna-badge--${latestJournal.gunaTag?.toLowerCase() || 'sattvic'}`}>
                {latestJournal.gunaTag || 'Sattvic'} ✦
              </span>
              <p>"{latestJournal.content}"</p>
              {latestJournal.createdAt && (
                <span className="journal-date">
                  {new Date(latestJournal.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
