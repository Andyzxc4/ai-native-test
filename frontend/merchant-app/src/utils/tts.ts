// Text-to-Speech utility functions

export const speakText = (text: string, options?: {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}) => {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser')
    return
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  
  // Set options
  utterance.rate = options?.rate || 1
  utterance.pitch = options?.pitch || 1
  utterance.volume = options?.volume || 1
  
  if (options?.voice) {
    utterance.voice = options.voice
  }

  // Speak the text
  window.speechSynthesis.speak(utterance)
}

export const speakPaymentConfirmation = (amount: number, recipientName?: string) => {
  const message = recipientName 
    ? `Payment of ${amount} PHP has been sent to ${recipientName}`
    : `Payment of ${amount} PHP has been sent successfully`
  
  speakText(message, {
    rate: 0.9,
    pitch: 1,
    volume: 0.8
  })
}

export const speakPaymentReceived = (amount: number, senderName?: string) => {
  const message = senderName
    ? `You have received ${amount} PHP from ${senderName}`
    : `You have received ${amount} PHP`
  
  speakText(message, {
    rate: 0.9,
    pitch: 1,
    volume: 0.8
  })
}

export const speakError = (message: string) => {
  speakText(`Error: ${message}`, {
    rate: 0.8,
    pitch: 0.8,
    volume: 0.7
  })
}

export const speakSuccess = (message: string) => {
  speakText(message, {
    rate: 0.9,
    pitch: 1.1,
    volume: 0.8
  })
}

export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  return window.speechSynthesis.getVoices()
}

export const stopSpeaking = () => {
  window.speechSynthesis.cancel()
}
