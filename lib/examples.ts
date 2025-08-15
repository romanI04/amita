// Pre-loaded example texts for demo mode
export interface ExampleText {
  id: string
  title: string
  category: 'academic' | 'business' | 'creative'
  description: string
  content: string
  wordCount: number
  // Pre-computed results for instant demo
  aiConfidence: number
  authenticityScore: number
  detectedIssues: string[]
  improvements: string[]
}

export const exampleTexts: ExampleText[] = [
  {
    id: 'academic-essay',
    title: 'Climate Change Research Essay',
    category: 'academic',
    description: 'A typical academic essay with mixed AI and human writing',
    content: `Climate change represents one of the most pressing challenges facing humanity in the 21st century. The overwhelming scientific consensus indicates that human activities, particularly the emission of greenhouse gases, are the primary driver of observed warming since the mid-20th century.

The evidence for climate change is multifaceted and compelling. Global average temperatures have risen by approximately 1.1 degrees Celsius since pre-industrial times. This warming trend is accompanied by melting ice sheets, rising sea levels, and increasingly frequent extreme weather events. The Intergovernmental Panel on Climate Change (IPCC) reports with high confidence that these changes are unprecedented in the context of human history.

However, addressing climate change requires more than just understanding the science. It demands coordinated global action across multiple sectors. Renewable energy technologies, such as solar and wind power, have become increasingly cost-competitive with fossil fuels. Many countries have implemented carbon pricing mechanisms to incentivize emissions reductions. Yet, the pace of change remains insufficient to meet the goals of the Paris Agreement.

The economic implications of climate change are substantial. Without mitigation efforts, climate change could reduce global GDP by 10-23% by the end of the century. Conversely, the transition to a low-carbon economy presents significant opportunities for innovation and job creation. The renewable energy sector already employs millions of people worldwide, and this number is expected to grow substantially in the coming decades.

In conclusion, while climate change poses severe risks to human society and natural ecosystems, the solutions are within our reach. The challenge lies not in the availability of technologies or strategies, but in the political will and social coordination necessary to implement them at scale.`,
    wordCount: 276,
    aiConfidence: 68,
    authenticityScore: 45,
    detectedIssues: [
      'Paragraph 2 uses formulaic academic structure common in AI writing',
      'Overuse of transitional phrases ("However", "Yet", "Conversely")',
      'Statistical claims lack specific citations'
    ],
    improvements: [
      'Add personal insights or original analysis',
      'Include specific examples and case studies',
      'Vary sentence structure for more natural flow'
    ]
  },
  {
    id: 'business-email',
    title: 'Project Update Email',
    category: 'business',
    description: 'A professional email with subtle AI patterns',
    content: `Subject: Q3 Project Milestone Update

Dear Team,

I hope this email finds you well. I wanted to provide a comprehensive update on our Q3 project milestones and address some key developments that have emerged over the past few weeks.

First and foremost, I'm pleased to report that we have successfully completed Phase 1 of the implementation ahead of schedule. The development team has done an exceptional job in delivering the core functionality while maintaining high code quality standards. All critical features have been implemented and passed initial testing.

Regarding Phase 2, we are currently on track to meet our October 15th deadline. The design team has finalized the user interface mockups, and development work is proceeding smoothly. We have identified and resolved several technical challenges that arose during integration testing.

However, I must bring to your attention a potential risk that could impact our timeline. The third-party API we're integrating has announced upcoming changes to their authentication system, scheduled for early November. Our technical team is already working on accommodating these changes, but we may need to allocate additional resources to ensure a smooth transition.

Moving forward, our priorities for the next two weeks are:
• Complete remaining Phase 2 development tasks
• Conduct comprehensive user acceptance testing
• Prepare documentation for the client review
• Begin preliminary work on Phase 3 requirements

I would appreciate if each department head could provide their status updates by end of day Thursday. Please don't hesitate to reach out if you have any questions or concerns.

Best regards,
Sarah Chen
Project Manager`,
    wordCount: 263,
    aiConfidence: 75,
    authenticityScore: 38,
    detectedIssues: [
      'Opening with "I hope this email finds you well" is an AI pattern',
      'Overly structured with perfect grammar throughout',
      'Lacks personal voice or team-specific context',
      'Bullet points are too formal and generic'
    ],
    improvements: [
      'Start with a more direct, personal opening',
      'Add team-specific details or inside references',
      'Use more conversational language',
      'Include specific names when discussing achievements'
    ]
  },
  {
    id: 'creative-story',
    title: 'Short Story Opening',
    category: 'creative',
    description: 'Creative writing with authentic human voice',
    content: `The coffee shop smelled wrong that Tuesday morning. Not bad, exactly—just wrong. Like someone had tried to recreate the scent of coffee from a description in a book.

Maya noticed it the moment she pushed through the door, her laptop bag catching on the handle like it always did. She'd been coming to The Grounded Bean for three years, ever since she'd started her dissertation, and the place had become an extension of her apartment. Hell, she probably spent more time here than at home.

But today, something was off.

The barista—not Josh, who usually worked Tuesdays, but a new girl with purple streaks in her hair—smiled a little too widely. "Welcome to The Grounded Bean! What can I craft for you today?"

Craft? Maya blinked. Since when did they say craft?

"Just a large coffee. Black."

"One venti dark roast, no modifications!" The girl's enthusiasm was exhausting for 7 AM.

Maya found her usual corner table, the wobbly one by the window that nobody else wanted. She'd written two chapters of her dissertation at this exact spot, surrounded by coffee rings and eraser shavings. The wobble had become oddly comforting, like the table was nodding along to her thoughts.

She opened her laptop and stared at the cursor blinking on the blank page. Chapter Seven: The Implications of Quantum Entanglement on Modern Philosophy. God, even she was bored by that title.

The wrong-smelling coffee arrived in a cup that was definitely new—too white, too perfect, missing the tiny chip on the rim that she'd grown fond of.

"Enjoy your beverage experience!" the barista chirped.

Maya took a sip and nearly spat it out. It tasted like coffee-flavored water. Like someone's idea of coffee who had never actually tasted it.

She looked around the shop more carefully now. When had they repainted? The walls were the same color but somehow... newer. Cleaner. Wrong.`,
    wordCount: 321,
    aiConfidence: 12,
    authenticityScore: 88,
    detectedIssues: [
      'Minor repetition of "wrong" could be intentional stylistic choice',
      'Some dialogue tags could be varied'
    ],
    improvements: [
      'Consider varying the word "wrong" in the opening',
      'Could add more sensory details beyond smell and taste'
    ]
  }
]

// Get a random example for quick demo
export function getRandomExample(): ExampleText {
  return exampleTexts[Math.floor(Math.random() * exampleTexts.length)]
}

// Get example by ID
export function getExampleById(id: string): ExampleText | undefined {
  return exampleTexts.find(ex => ex.id === id)
}

// Get examples by category
export function getExamplesByCategory(category: ExampleText['category']): ExampleText[] {
  return exampleTexts.filter(ex => ex.category === category)
}