interface SendPasswordResetEmailParams {
  to: string
  resetLink: string
}

export async function sendPasswordResetEmail({
  to,
  resetLink,
}: SendPasswordResetEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()

  if (!apiKey || !from) {
    console.warn('[auth] RESEND_API_KEY or EMAIL_FROM not set. Password reset email not sent.')
    console.info(`[auth] Password reset link for ${to}: ${resetLink}`)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Meowlytics 密码重置',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a;">
          <h2 style="margin: 0 0 12px;">重置你的 Meowlytics 密码</h2>
          <p>你发起了密码重置请求。点击下方按钮设置新密码（30 分钟内有效）：</p>
          <p>
            <a href="${resetLink}" style="display: inline-block; background: #ea580c; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
              立即重置密码
            </a>
          </p>
          <p>如果按钮无法点击，请复制这个链接到浏览器：</p>
          <p style="word-break: break-all;">${resetLink}</p>
          <p>如果这不是你的操作，请忽略此邮件。</p>
        </div>
      `,
      text: `重置你的 Meowlytics 密码（30 分钟内有效）：${resetLink}\n\n如果这不是你的操作，请忽略此邮件。`,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`发送重置邮件失败: ${detail}`)
  }
}
