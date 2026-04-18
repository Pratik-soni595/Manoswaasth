import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, ArrowLeft, Leaf, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import { sendChatMessage } from '../api/ai.api';
import './Chat.css';

const quickTopics = ['Stress Relief', 'Better Sleep', 'Digestion', 'Morning Routine', 'Breathing', 'Diet Tips'];

const initialMessages = [
  { id: 1, sender: 'ai', text: "Namaste! 🙏 I'm your Ayurvedic wellness companion. I can help you with stress management, sleep, digestion, breathing exercises, and Dosha-specific guidance. What's on your mind today?" },
];

const aiResponses = {
  stress: "For stress relief, Ayurveda recommends **Ashwagandha tea** in the evening, along with **Abhyanga** (warm oil self-massage) before bed. Try the 4-7-8 breathing technique: inhale for 4 counts, hold for 7, exhale for 8. This activates your parasympathetic nervous system. 🌿",
  sleep: "For better sleep, try drinking **warm nutmeg milk** 30 minutes before bed — just a pinch of nutmeg in warm milk with a drop of ghee. Avoid screens after 9 PM and practice **Nadi Shodhana** (alternate nostril breathing) for 5 minutes. Your body will thank you. 🌙",
  digestion: "For healthy digestion, start your morning with **warm lemon water with fresh ginger**. Eat your largest meal at lunch when your Agni (digestive fire) is strongest. Avoid cold drinks with meals — warm water or herbal tea is ideal. Consider adding **Triphala** before bed. 🍃",
  morning: "An ideal Ayurvedic morning routine (Dinacharya): Wake before 6 AM → Scrape your tongue → Oil pulling with sesame oil → Warm lemon water → 15 min yoga or walking → Meditation → Nourishing breakfast. Start with just 2-3 practices and build gradually. ☀️",
  breathing: "Here are three powerful Pranayama exercises:\n\n**Box Breathing (4-4-4-4):** Inhale 4s, hold 4s, exhale 4s, hold 4s. Great for immediate calm.\n\n**4-7-8 Breathing:** Inhale 4s, hold 7s, exhale 8s. A natural nervous system tranquilizer.\n\n**Nadi Shodhana:** Alternate nostril breathing for 5 minutes. Balances brain hemispheres. 🌬️",
  diet: "Ayurvedic diet principles:\n\n🔥 **Pitta:** Favor cooling foods — cucumber, coconut, mint, sweet fruits. Avoid spicy, acidic foods.\n\n🌬️ **Vata:** Favor warm, grounding foods — soups, ghee, cooked grains. Avoid raw, cold foods.\n\n🌍 **Kapha:** Favor light, warming foods — ginger, greens, beans. Avoid heavy, oily foods.",
  default: "That's a wonderful question! In Ayurveda, balance is the key to wellness. I'd recommend starting with understanding your Dosha constitution — take our quiz if you haven't already. For general wellness, focus on: rising with the sun, drinking warm water, eating mindfully, and practicing daily meditation. How can I help you further? 🌿",
};

function getAiResponse(text) {
  const lower = text.toLowerCase();
  if (lower.includes('stress') || lower.includes('anxiety') || lower.includes('anxious')) return aiResponses.stress;
  if (lower.includes('sleep') || lower.includes('insomnia') || lower.includes('rest')) return aiResponses.sleep;
  if (lower.includes('digest') || lower.includes('stomach') || lower.includes('eat')) return aiResponses.digestion;
  if (lower.includes('morning') || lower.includes('routine') || lower.includes('dinacharya')) return aiResponses.morning;
  if (lower.includes('breath') || lower.includes('pranayama') || lower.includes('breathing')) return aiResponses.breathing;
  if (lower.includes('diet') || lower.includes('food') || lower.includes('nutrition')) return aiResponses.diet;
  return aiResponses.default;
}

export default function Chat() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), sender: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(text);
      if (response && response.reply) {
        const aiMsg = { id: Date.now() + 1, sender: 'ai', text: response.reply };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('AI Chat Error. Using local fallback.', error);
      // Fallback simulates processing time before fulfilling
      await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
      const aiMsg = { id: Date.now() + 1, sender: 'ai', text: getAiResponse(text) };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <AnimatedPage>
      <div className="chat-page">
        <div className="chat-layout">
          {/* Main Chat Panel */}
          <div className="chat-panel">
            <div className="chat-panel__header">
              <Link to="/" className="chat-panel__back"><ArrowLeft size={18} /></Link>
              <div className="chat-panel__header-icon">
                <Sparkles size={18} />
              </div>
              <div className="chat-panel__header-info">
                <h2>Ayurveda Wellness Companion</h2>
                <span className="chat-panel__status">
                  <span className="chat-panel__status-dot" /> Online
                </span>
              </div>
            </div>

            <div className="chat-panel__messages">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`chat-msg chat-msg--${msg.sender}`}
                    initial={{ opacity: 0, x: msg.sender === 'user' ? 30 : -30, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
                  >
                    {msg.sender === 'ai' && (
                      <div className="chat-msg__avatar">
                        <Leaf size={14} />
                      </div>
                    )}
                    <div className="chat-msg__bubble">
                      <p dangerouslySetInnerHTML={{
                        __html: msg.text
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\n/g, '<br/>')
                      }} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  className="chat-msg chat-msg--ai"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="chat-msg__avatar"><Leaf size={14} /></div>
                  <div className="chat-msg__bubble chat-msg__typing">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-panel__input" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Ask about your wellness journey..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <motion.button
                type="submit"
                className="chat-panel__send"
                whileHover={{ scale: 1.1, boxShadow: '0 0 16px rgba(44,95,78,0.3)' }}
                whileTap={{ scale: 0.9 }}
                disabled={!input.trim()}
              >
                <Send size={18} />
              </motion.button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="chat-sidebar">
            <div className="chat-sidebar__section">
              <h3 className="chat-sidebar__title">Quick Topics</h3>
              <div className="chat-sidebar__topics">
                {quickTopics.map((topic) => (
                  <motion.button
                    key={topic}
                    className="topic-pill"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage(topic)}
                  >
                    {topic}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="chat-sidebar__section">
              <h3 className="chat-sidebar__title">Your Profile</h3>
              <div className="chat-sidebar__profile">
                <div className="chat-sidebar__dosha-indicator" />
                <div>
                  <span className="chat-sidebar__dosha-name">Pitta</span>
                  <span className="chat-sidebar__dosha-elem">Fire & Water</span>
                </div>
              </div>
            </div>

            <div className="chat-sidebar__section">
              <h3 className="chat-sidebar__title">Recommended</h3>
              <div className="chat-sidebar__recs">
                <div className="rec-card">
                  <MessageCircle size={16} />
                  <span>Sheetali Breath — cooling pranayama for Pitta</span>
                </div>
                <div className="rec-card">
                  <Leaf size={16} />
                  <span>Coconut water — natural Pitta coolant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
