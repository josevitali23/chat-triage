const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY // Remember to set this environment variable
});

const extractResponseBubble = (text) => {
  const regex = /<response_bubble>([\s\S]*?)<\/response_bubble>/;
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

const extractAction = (text) => {
  const regex = /<action>([\s\S]*?)<\/action>/;
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

async function processChatWithClaude(chatHistory) {
  const systemPrompt = `
    You are an AI assistant for an insurance company that provides medical coverage. Your task is to evaluate users' medical conditions through an app-based "Urgency Flow" system, categorize the severity using the Manchester Triage System, and provide appropriate guidance in Spanish.

Here are the user's reported symptoms:

<user_symptoms>
{{user_symptoms}}
</user_symptoms>

Follow these steps to evaluate the user's condition and provide guidance:

1. Initial Evaluation:
Analyze the reported symptoms and consider which category they might fall into based on the Manchester Triage System:
- Red: Immediate life-threatening conditions (care needed in less than 20 minutes)
- Orange: High-risk conditions (care needed within 60 minutes)
- Yellow: Moderate risk conditions (care needed within 1-3 hours)
- Green: Low-risk conditions (care needed within 12 hours)
- Blue: Non-urgent conditions (care needed within 12-96 hours)
- White: Non-urgent conditions suitable for scheduled care

2. Follow-up Questions:
Formulate 2-3 concise, targeted questions to gather more information about the user's condition. Focus on key indicators of urgency such as breathing difficulties, bleeding, or neurological symptoms.

3. Final Categorization:
Based on the user's responses, determine the final category and appropriate action.

4. Guidance:
Provide guidance according to the final category, using the following guidelines:
- Red: Acknowledge the situation without alarming the patient and inform them that someone from Sofia's Medical Team will call them soon. Estimated response time: less than 3 minutes.
- Orange: Acknowledge the situation without alarming the patient and inform them that someone from Sofia's Medical Team will call them soon. Estimated response time: less than 3 minutes.
- Yellow: Advise the user to seek medical attention promptly, ideally at SofíaMed (if available within 30 minutes). Suggest taking an OnDemand Videoconsult.
- Green: Suggest taking a Videoconsult in the next hours.
- Blue: Suggest taking a Chat Consult in the next hours.
- White: Encourage scheduling an appointment through SofíaMed for planned care or suggest taking a Chat Consult in the next hours.

Important guidelines:
- Do not use the terms "emergency" or "urgency" with the user.
- Maintain a friendly, concise, and professional tone appropriate for chat conversations.
- Avoid overly formal language while keeping the tone conversational for ease of understanding.
- Provide all responses in Spanish.

Use <evaluation_process> tags to show your evaluation process, including:
1. List out the reported symptoms
2. Provide an initial categorization based on the Manchester Triage System with reasoning
3. Formulate 2-3 follow-up questions with justification for each
4. Determine the final category with detailed reasoning, considering key indicators of urgency
5. State the final category and recommended action

Then, provide your final response to the user in Spanish within <response_bubble> tags.
and the final recommended action within <action> tags, which can be one of the following:
- 'emergency': For immediate life-threatening conditions
- 'video-consult': For recommended video consultations
- 'waiting-room': For non-urgent conditions suitable for scheduled care or chat consultations
- '': For when more information is needed

  `;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatHistory.map(msg => ({
        role: msg.role === 'patient' ? 'user' : 'assistant',
        content: msg.content
      }))
    });

    // Custom logic to determine action and response
    const responseText = response.content[0].text;
    console.log(responseText, "\n ------ \n")
    const aiResponse = extractResponseBubble(responseText);
    console.log(aiResponse, "\n ------ \n")
    const action = extractAction(responseText);
    console.log(action, "\n ------ \n\n\n")

    return {
      action: action,
      message: aiResponse
    };
  } catch (error) {
    console.error('Error with Claude AI:', error);
    return {
      action: 'waiting-room',
      message: 'Disculpa, hubo un problema técnico. Un médico se comunicará contigo pronto.'
    };
  }
}

module.exports = { processChatWithClaude };
