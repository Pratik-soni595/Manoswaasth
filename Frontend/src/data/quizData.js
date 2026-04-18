export const quizData = [
  {
    category: "Physical Characteristics",
    key: "physical",
    questions: [
      {
        id: "body_frame",
        question: "Body Frame (Natural skeletal build)",
        description: "Think about your natural body structure, not your current weight or fitness level. Focus on the size and density of your bones, the width of your shoulders, and your overall body build that has remained mostly consistent throughout your life. Try to base your answer on how your body has naturally appeared since adolescence rather than temporary changes.",
        options: [
          { label: "A", text: "Thin, light bones; smaller frame", dosha: "Vata" },
          { label: "B", text: "Medium build; athletic and proportional", dosha: "Pitta" },
          { label: "C", text: "Large, broad, or sturdy frame", dosha: "Kapha" }
        ]
      },
      {
        id: "weight_gain_tendency",
        question: "Weight Gain Tendency",
        description: "Consider how your body typically responds to changes in diet and physical activity. Reflect on whether you naturally remain thin, experience fluctuations in weight, or tend to gain weight quickly and find it difficult to lose. Focus on your long-term pattern rather than short-term changes.",
        options: [
          { label: "A", text: "Hard to gain weight", dosha: "Vata" },
          { label: "B", text: "Gain and lose weight easily", dosha: "Pitta" },
          { label: "C", text: "Gain weight easily and hard to lose", dosha: "Kapha" }
        ]
      },
      {
        id: "skin_type",
        question: "Skin Type",
        description: "Think about the natural condition of your skin without relying on skincare products or treatments. Observe whether your skin tends to feel dry, oily, sensitive, or consistently soft. Consider how your skin behaves across most seasons rather than occasional or temporary conditions.",
        options: [
          { label: "A", text: "Dry, rough, or easily cracked", dosha: "Vata" },
          { label: "B", text: "Oily, sensitive, or prone to redness", dosha: "Pitta" },
          { label: "C", text: "Thick, smooth, soft, and well-moisturized", dosha: "Kapha" }
        ]
      },
      {
        id: "body_temp",
        question: "Body Temperature",
        description: "Reflect on how your body usually reacts to temperature compared to others around you. Do you often feel colder than others, warmer than others, or generally comfortable in most environments? Consider your natural tolerance to both cold and heat.",
        options: [
          { label: "A", text: "Often feel cold", dosha: "Vata" },
          { label: "B", text: "Often feel warm or hot", dosha: "Pitta" },
          { label: "C", text: "Generally moderate or slightly cool", dosha: "Kapha" }
        ]
      },
      {
        id: "energy_levels",
        question: "Energy Levels During the Day",
        description: "Think about how your energy naturally fluctuates throughout the day. Some people experience quick bursts of energy followed by fatigue, while others maintain a consistent level of activity or move at a slower but more sustained pace. Focus on your usual daily rhythm.",
        options: [
          { label: "A", text: "Sudden bursts of energy but tire quickly", dosha: "Vata" },
          { label: "B", text: "Strong and consistent energy", dosha: "Pitta" },
          { label: "C", text: "Steady but slower energy that lasts long", dosha: "Kapha" }
        ]
      }
    ]
  },
  {
    category: "Metabolism and Digestive Characteristics",
    key: "metabolism",
    questions: [
      {
        id: "appetite",
        question: "Appetite",
        description: "Consider how frequently and intensely you feel hungry during the day. Reflect on whether your hunger comes and goes unpredictably, remains strong and regular, or stays moderate and stable. Think about your natural eating tendencies rather than controlled habits.",
        options: [
          { label: "A", text: "Irregular hunger; fluctuates", dosha: "Vata" },
          { label: "B", text: "Strong appetite; dislike skipping meals", dosha: "Pitta" },
          { label: "C", text: "Calm and steady appetite", dosha: "Kapha" }
        ]
      },
      {
        id: "digestion",
        question: "Digestion",
        description: "Reflect on how your body typically processes food. Notice whether you often experience discomfort such as bloating or gas, digest food quickly without issues, or feel heaviness and sluggishness after meals. Base your answer on your usual experience.",
        options: [
          { label: "A", text: "Irregular; bloating or gas common", dosha: "Vata" },
          { label: "B", text: "Fast and efficient digestion", dosha: "Pitta" },
          { label: "C", text: "Slow digestion; feel heavy after meals", dosha: "Kapha" }
        ]
      },
      {
        id: "skipping_meals",
        question: "Reaction to Skipping Meals",
        description: "Think about how your body reacts when you miss or delay meals. Some people feel weak or uneasy after some time, others quickly become irritable, while some can comfortably skip meals without noticeable effects. Choose the option that reflects your typical response.",
        options: [
          { label: "A", text: "May forget meals but later feel weak or uneasy", dosha: "Vata" },
          { label: "B", text: "Become irritable or uncomfortable quickly", dosha: "Pitta" },
          { label: "C", text: "Usually unaffected and can tolerate skipping meals", dosha: "Kapha" }
        ]
      },
      {
        id: "food_preference",
        question: "Food Preference",
        description: "Consider the types of foods you are naturally drawn to. Reflect on whether you tend to prefer warm and comforting meals, cooling and refreshing foods, or lighter meals with mild spices. Answer based on instinctive preference rather than dietary restrictions.",
        options: [
          { label: "A", text: "Prefer warm, moist foods", dosha: "Vata" },
          { label: "B", text: "Prefer cool or refreshing foods", dosha: "Pitta" },
          { label: "C", text: "Prefer light or mildly spiced foods", dosha: "Kapha" }
        ]
      },
      {
        id: "heavy_meals",
        question: "Reaction to Heavy Meals",
        description: "Think about how your body responds after consuming large or heavy meals. Do you feel discomfort or bloating, remain comfortable and energized, or feel slow and heavy? Focus on your most common experience after overeating.",
        options: [
          { label: "A", text: "Feel bloated or uncomfortable quickly", dosha: "Vata" },
          { label: "B", text: "Digest meals easily without discomfort", dosha: "Pitta" },
          { label: "C", text: "Feel heavy or sluggish after eating", dosha: "Kapha" }
        ]
      }
    ]
  },
  {
    category: "Mental and Emotional Characteristics",
    key: "mental",
    questions: [
      {
        id: "sleep_pattern",
        question: "Sleep Pattern",
        description: "Consider the quality and depth of your sleep. Reflect on whether you wake up easily due to noise or disturbances, experience moderate sleep with occasional interruptions, or sleep deeply for longer durations and find it difficult to wake up.",
        options: [
          { label: "A", text: "Light sleep; easily disturbed", dosha: "Vata" },
          { label: "B", text: "Moderate sleep; may wake occasionally", dosha: "Pitta" },
          { label: "C", text: "Deep, long sleep; hard to wake", dosha: "Kapha" }
        ]
      },
      {
        id: "mental_focus",
        question: "Mental Focus",
        description: "Think about how well you can maintain attention on tasks. Some people have creative and active minds but struggle with distraction, while others are highly focused and goal-driven, or slow but steady in maintaining concentration over time.",
        options: [
          { label: "A", text: "Creative but easily distracted", dosha: "Vata" },
          { label: "B", text: "Sharp and goal-oriented", dosha: "Pitta" },
          { label: "C", text: "Steady and consistent focus", dosha: "Kapha" }
        ]
      },
      {
        id: "stress_reaction",
        question: "Negative Emotion Under Stress",
        description: "Reflect on your natural emotional reaction when you are under stress or pressure. Some individuals tend to feel anxious or worried, others become irritated or angry, while some withdraw or feel low. Choose the response that occurs most frequently.",
        options: [
          { label: "A", text: "Anxiety or fear", dosha: "Vata" },
          { label: "B", text: "Anger or irritability", dosha: "Pitta" },
          { label: "C", text: "Withdrawal or low mood", dosha: "Kapha" }
        ]
      },
      {
        id: "decision_making",
        question: "Decision Making",
        description: "Think about how you approach decisions in your daily life. Do you tend to decide quickly but reconsider later, make confident and precise decisions, or take more time but remain firm once a choice is made?",
        options: [
          { label: "A", text: "Make quick decisions but often change mind", dosha: "Vata" },
          { label: "B", text: "Clear and confident decision maker", dosha: "Pitta" },
          { label: "C", text: "Slow but firm decisions", dosha: "Kapha" }
        ]
      },
      {
        id: "motivation_style",
        question: "Motivation Style",
        description: "Consider what naturally drives you to take action. Some people are inspired by novelty and new ideas, others by goals and achievements, while some are motivated by stability, routine, and comfort. Reflect on what consistently pushes you forward.",
        options: [
          { label: "A", text: "Motivated by excitement and new ideas", dosha: "Vata" },
          { label: "B", text: "Motivated by achievement and success", dosha: "Pitta" },
          { label: "C", text: "Motivated by stability and comfort", dosha: "Kapha" }
        ]
      }
    ]
  }
];

export const getFlatQuestions = () => {
  const flatQuestions = [];
  quizData.forEach((section, sectionIndex) => {
    section.questions.forEach((q, qIndex) => {
      flatQuestions.push({
        ...q,
        categoryName: section.category,
        categoryKey: section.key,
        globalIndex: flatQuestions.length,
        isLastInCategory: qIndex === section.questions.length - 1,
        isFirstInCategory: qIndex === 0
      });
    });
  });
  return flatQuestions;
};
