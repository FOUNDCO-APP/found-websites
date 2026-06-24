export const leadTypeLineMap: Record<string, string> = {
  estimates: "estimate request",
  bookings: "booking request",
  appointments: "appointment request",
  orders: "order",
  reservations: "reservation request",
  inquiries: "inquiry",
}

export function buildLeadEmail({
  company,
  name,
  phone,
  email,
  service,
  message,
  replyUrl,
}: {
  company: { name: string; email: string; phone: string | null; primary_intent?: string | null }
  name: string
  phone: string
  email: string
  service: string
  message: string
  replyUrl: string
}) {
  const cleanPhone = phone.replace(/\D/g, "")
  const firstName = name.split(" ")[0]
  const receivedAt = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
  const leadTypeLine = leadTypeLineMap[company.primary_intent ?? ""] ?? "new request"

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">New Lead</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 24px;font-size:16px;color:#444444;">You have a new ${leadTypeLine} from your website.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:28px;">
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Received</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#555555;">${receivedAt}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Name</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${name}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Phone</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${phone}</p>
              </td></tr>
              ${email ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Email</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${email}</p>
              </td></tr>` : ""}
              ${service ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Service Requested</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${service}</p>
              </td></tr>` : ""}
              ${message ? `<tr><td>
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Message</p>
                <p style="margin:0;font-size:15px;color:#333333;line-height:1.6;">${message}</p>
              </td></tr>` : ""}
            </table>
            <p style="margin:0 0 20px;font-size:13px;color:#888888;font-style:italic;">The first to respond usually wins the business. Reach out now while they&apos;re still looking.</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:6px;">
                  <a href="tel:${cleanPhone}" style="display:block;text-align:center;background:#111111;color:#ffffff;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Call ${firstName}</a>
                </td>
                <td style="padding-right:6px;padding-left:2px;">
                  <a href="sms:${cleanPhone}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Text ${firstName}</a>
                </td>
                ${email ? `<td style="padding-left:2px;">
                  <a href="${replyUrl}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Email ${firstName}</a>
                </td>` : ""}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#888888;">You've been Found.</p>
            <p style="margin:0;font-size:11px;color:#bbbbbb;">Powered by <a href="https://foundco.app" style="color:#bbbbbb;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildAutoReplyEmail({
  company,
  name,
  phone,
}: {
  company: { name: string; phone: string | null }
  name: string
  phone: string | null
}) {
  const firstName = name.split(" ")[0]
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Message Received</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#111111;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.7;">
              Thank you for reaching out to <strong>${company.name}</strong>. We received your message and someone will be in touch with you as soon as possible.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#444444;line-height:1.7;">
              If you need to reach us right away, don&apos;t hesitate to call.
            </p>
            ${phone ? `<a href="tel:${phone.replace(/\D/g, "")}" style="display:inline-block;background:#111111;color:#ffffff;font-size:14px;font-weight:800;padding:16px 32px;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">Call ${company.name}</a>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#888888;">${company.name}</p>
            ${phone ? `<p style="margin:0 0 4px;font-size:12px;color:#bbbbbb;">${phone}</p>` : ""}
            <p style="margin:8px 0 0;font-size:11px;color:#cccccc;">Powered by <a href="https://foundco.app" style="color:#cccccc;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildReservationEmail({
  company, name, phone, email, date, time, partySize, notes, replyUrl,
}: {
  company: { name: string; email: string; phone: string | null }
  name: string; phone: string; email: string; date: string; time: string
  partySize: string | null; notes: string; replyUrl: string
}) {
  const cleanPhone = phone.replace(/\D/g, "")
  const firstName = name.split(" ")[0]
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">New Reservation Request</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:28px;">
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Guest</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${name}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Date</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${date}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Time</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${time}</p>
              </td></tr>
              ${partySize ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Party Size</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${partySize} ${partySize === "1" ? "guest" : "guests"}</p>
              </td></tr>` : ""}
              <tr><td style="padding-bottom:${notes ? "16px" : "0"};">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Phone</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${phone}</p>
              </td></tr>
              ${email ? `<tr><td style="padding-bottom:${notes ? "16px" : "0"};">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Email</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${email}</p>
              </td></tr>` : ""}
              ${notes ? `<tr><td>
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Notes</p>
                <p style="margin:0;font-size:15px;color:#333333;line-height:1.6;">${notes}</p>
              </td></tr>` : ""}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:6px;">
                  <a href="tel:${cleanPhone}" style="display:block;text-align:center;background:#111111;color:#ffffff;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Call ${firstName}</a>
                </td>
                <td style="padding-left:6px;padding-right:6px;">
                  <a href="sms:${cleanPhone}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Text ${firstName}</a>
                </td>
                ${email ? `<td style="padding-left:6px;">
                  <a href="${replyUrl}" style="display:block;text-align:center;background:#f0f0f0;color:#111111;font-size:13px;font-weight:800;padding:14px 10px;border-radius:50px;text-decoration:none;">Email ${firstName}</a>
                </td>` : ""}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;">Powered by <a href="https://foundco.app" style="color:#bbbbbb;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildReservationAutoReply({
  company, name, date, time, partySize, phone,
}: {
  company: { name: string; phone: string | null }
  name: string; date: string; time: string; partySize: string | null; phone: string | null
}) {
  const firstName = name.split(" ")[0]
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">Reservation Request Received</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#111111;">Hi ${firstName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.7;">
              We received your reservation request for <strong>${date} at ${time}</strong>${partySize ? ` for ${partySize} ${partySize === "1" ? "guest" : "guests"}` : ""}.
            </p>
            <p style="margin:0 0 32px;font-size:15px;color:#444444;line-height:1.7;">
              Someone from <strong>${company.name}</strong> will confirm your reservation as soon as possible. If you need to reach us right away, please call.
            </p>
            ${phone ? `<a href="tel:${phone.replace(/\D/g, "")}" style="display:inline-block;background:#111111;color:#ffffff;font-size:14px;font-weight:800;padding:16px 32px;border-radius:50px;text-decoration:none;">Call ${company.name}</a>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#cccccc;">Powered by <a href="https://foundco.app" style="color:#cccccc;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Booking calendar: owner notification ────────────────────────────────────
export function buildBookingNotification({
  company,
  name,
  phone,
  email,
  displayDate,
  displayTime,
  service,
  notes,
  confirmationCode,
  replyUrl,
  bookingNoun = "booking",
}: {
  company: { name: string }
  name: string
  phone: string
  email: string
  displayDate: string
  displayTime: string
  service: string
  notes: string
  confirmationCode: string
  replyUrl: string
  bookingNoun?: string
}) {
  const nounCap = bookingNoun.charAt(0).toUpperCase() + bookingNoun.slice(1)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">New ${nounCap}</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 24px;font-size:16px;color:#444444;">You have a new ${bookingNoun} from your website.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:28px;">
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Date</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${displayDate}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Time</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${displayTime}</p>
              </td></tr>
              ${confirmationCode ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Confirmation #</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#555555;">${confirmationCode}</p>
              </td></tr>` : ""}
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Name</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${name}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Phone</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#333333;"><a href="tel:${phone.replace(/\D/g, "")}" style="color:#333333;text-decoration:none;">${phone}</a></p>
              </td></tr>
              ${email ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Email</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#333333;">${email}</p>
              </td></tr>` : ""}
              ${service ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Details</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#333333;">${service}</p>
              </td></tr>` : ""}
              ${notes ? `<tr><td>
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Notes</p>
                <p style="margin:0;font-size:15px;color:#333333;line-height:1.6;">${notes}</p>
              </td></tr>` : ""}
            </table>
            <a href="${replyUrl}" style="display:inline-block;background:#111111;color:#ffffff;font-size:14px;font-weight:800;padding:16px 32px;border-radius:50px;text-decoration:none;">View in Found</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#cccccc;">Powered by <a href="https://foundco.app" style="color:#cccccc;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Booking calendar: customer confirmation ──────────────────────────────────
export function buildBookingConfirmation({
  company,
  name,
  displayDate,
  displayTime,
  service,
  confirmationCode,
  bookingNoun = "booking",
  confirmMode = "instant",
}: {
  company: { name: string; phone: string | null }
  name: string
  displayDate: string
  displayTime: string
  service: string
  confirmationCode: string
  bookingNoun?: string
  confirmMode?: "instant" | "soft"
}) {
  const firstName = name.split(" ")[0]
  const nounCap = bookingNoun.charAt(0).toUpperCase() + bookingNoun.slice(1)
  const headerLabel = confirmMode === "instant" ? `${nounCap} confirmed` : `${nounCap} scheduled`
  const bodyText = confirmMode === "instant"
    ? `Hi ${firstName}, your ${bookingNoun} is confirmed!`
    : `Hi ${firstName}, your ${bookingNoun} is scheduled for ${displayDate} at ${displayTime}. We'll reach out shortly to confirm the details.`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#111111;padding:32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#888888;">${headerLabel}</p>
            <h1 style="margin:0;font-size:22px;font-weight:900;color:#ffffff;">${company.name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 24px;font-size:16px;color:#444444;">${bodyText}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:28px;">
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Date</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${displayDate}</p>
              </td></tr>
              <tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Time</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${displayTime}</p>
              </td></tr>
              ${service ? `<tr><td style="padding-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Details</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#333333;">${service}</p>
              </td></tr>` : ""}
              ${confirmationCode ? `<tr><td>
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;">Confirmation #</p>
                <p style="margin:0;font-size:17px;font-weight:800;color:#111111;">${confirmationCode}</p>
              </td></tr>` : ""}
            </table>
            ${company.phone ? `<p style="margin:0 0 24px;font-size:14px;color:#666666;line-height:1.6;">
              Need to change or cancel? Call us at <a href="tel:${company.phone.replace(/\D/g, "")}" style="color:#111111;font-weight:600;">${company.phone}</a>.
            </p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#cccccc;">Powered by <a href="https://foundco.app" style="color:#cccccc;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
