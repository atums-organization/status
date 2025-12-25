import nodemailer from "nodemailer";
import type { SiteSettings, EmailOptions } from "../../types";
import { getSettings } from "../routes/settings";

async function createTransporter(settings: SiteSettings) {
	return nodemailer.createTransport({
		host: settings.smtpHost,
		port: Number.parseInt(settings.smtpPort, 10) || 587,
		secure: settings.smtpSecure,
		auth: {
			user: settings.smtpUser,
			pass: settings.smtpPass,
		},
	});
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
	const settings = await getSettings();

	if (!settings.smtpEnabled || !settings.smtpHost || !settings.smtpUser) {
		return false;
	}

	try {
		const transporter = await createTransporter(settings);

		await transporter.sendMail({
			from: settings.smtpFrom || settings.smtpUser,
			to: options.to,
			subject: options.subject,
			text: options.text,
			html: options.html,
		});

		return true;
	} catch (error) {
		console.error("[Email] Failed to send email:", error);
		return false;
	}
}

export async function sendServiceDownEmail(
	serviceName: string,
	checkUrl: string,
	displayUrl: string | null,
	groupName: string | null,
	statusCode: number | null,
	errorMessage: string | null,
): Promise<void> {
	const settings = await getSettings();

	if (!settings.smtpEnabled || !settings.emailTo) {
		return;
	}

	const siteName = settings.siteName || "Status Monitor";
	const subject = `[${siteName}] Service Down: ${serviceName}`;
	const shownUrl = displayUrl || checkUrl;

	const text = [
		`Service "${serviceName}" is DOWN`,
		"",
		`URL: ${shownUrl}`,
		displayUrl && displayUrl !== checkUrl ? `Check URL: ${checkUrl}` : null,
		groupName ? `Group: ${groupName}` : null,
		statusCode ? `Status Code: ${statusCode}` : null,
		errorMessage ? `Error: ${errorMessage}` : null,
		"",
		`Time: ${new Date().toISOString()}`,
	]
		.filter(Boolean)
		.join("\n");

	const html = `
		<h2 style="color: #ef4444;">Service Down: ${serviceName}</h2>
		<p><strong>URL:</strong> <a href="${shownUrl}">${shownUrl}</a></p>
		${displayUrl && displayUrl !== checkUrl ? `<p><strong>Check URL:</strong> <a href="${checkUrl}">${checkUrl}</a></p>` : ""}
		${groupName ? `<p><strong>Group:</strong> ${groupName}</p>` : ""}
		${statusCode ? `<p><strong>Status Code:</strong> ${statusCode}</p>` : ""}
		${errorMessage ? `<p><strong>Error:</strong> ${errorMessage}</p>` : ""}
		<p><strong>Time:</strong> ${new Date().toISOString()}</p>
		<hr>
		<p style="color: #666; font-size: 12px;">Sent by ${siteName}</p>
	`;

	await sendEmail({
		to: settings.emailTo,
		subject,
		text,
		html,
	});
}

export async function sendServiceUpEmail(
	serviceName: string,
	checkUrl: string,
	displayUrl: string | null,
	groupName: string | null,
	responseTime: number,
): Promise<void> {
	const settings = await getSettings();

	if (!settings.smtpEnabled || !settings.emailTo) {
		return;
	}

	const siteName = settings.siteName || "Status Monitor";
	const subject = `[${siteName}] Service Up: ${serviceName}`;
	const shownUrl = displayUrl || checkUrl;

	const text = [
		`Service "${serviceName}" is UP`,
		"",
		`URL: ${shownUrl}`,
		displayUrl && displayUrl !== checkUrl ? `Check URL: ${checkUrl}` : null,
		groupName ? `Group: ${groupName}` : null,
		`Response Time: ${responseTime}ms`,
		"",
		`Time: ${new Date().toISOString()}`,
	]
		.filter(Boolean)
		.join("\n");

	const html = `
		<h2 style="color: #22c55e;">Service Up: ${serviceName}</h2>
		<p><strong>URL:</strong> <a href="${shownUrl}">${shownUrl}</a></p>
		${displayUrl && displayUrl !== checkUrl ? `<p><strong>Check URL:</strong> <a href="${checkUrl}">${checkUrl}</a></p>` : ""}
		${groupName ? `<p><strong>Group:</strong> ${groupName}</p>` : ""}
		<p><strong>Response Time:</strong> ${responseTime}ms</p>
		<p><strong>Time:</strong> ${new Date().toISOString()}</p>
		<hr>
		<p style="color: #666; font-size: 12px;">Sent by ${siteName}</p>
	`;

	await sendEmail({
		to: settings.emailTo,
		subject,
		text,
		html,
	});
}

export async function sendTestEmail(): Promise<{ success: boolean; error?: string }> {
	const settings = await getSettings();

	if (!settings.smtpHost || !settings.smtpUser) {
		return { success: false, error: "SMTP not configured" };
	}

	if (!settings.emailTo) {
		return { success: false, error: "No recipient email configured" };
	}

	const siteName = settings.siteName || "Status Monitor";
	const subject = `[${siteName}] Test Email`;

	const text = [
		"This is a test email from your status monitor.",
		"",
		"If you received this email, your SMTP settings are configured correctly.",
		"",
		`Time: ${new Date().toISOString()}`,
	].join("\n");

	const html = `
		<h2 style="color: #3b82f6;">Test Email</h2>
		<p>This is a test email from your status monitor.</p>
		<p>If you received this email, your SMTP settings are configured correctly.</p>
		<p><strong>Time:</strong> ${new Date().toISOString()}</p>
		<hr>
		<p style="color: #666; font-size: 12px;">Sent by ${siteName}</p>
	`;

	try {
		const transporter = await createTransporter(settings);

		await transporter.sendMail({
			from: settings.smtpFrom || settings.smtpUser,
			to: settings.emailTo,
			subject,
			text,
			html,
		});

		return { success: true };
	} catch (error) {
		console.error("[Email] Failed to send test email:", error);

		if (error && typeof error === "object") {
			const err = error as { message?: string; code?: string; command?: string };
			const parts: string[] = [];

			if (err.code) parts.push(err.code);
			if (err.command) parts.push(`command: ${err.command}`);
			if (err.message) parts.push(err.message);

			if (parts.length > 0) {
				return { success: false, error: parts.join(" - ") };
			}
		}

		return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
	}
}
