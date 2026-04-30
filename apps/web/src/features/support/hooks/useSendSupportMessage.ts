export const sendSupportMessage = async (data: { threadId: string; senderId: string; senderRole: string; content: string }) => {
  console.log('Message envoyé:', data)

  return {
    success: true,
  }
}