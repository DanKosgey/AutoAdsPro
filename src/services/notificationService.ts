/**
 * Notification Service
 * Sends notifications to the owner
 */

import { WASocket } from '@whiskeysockets/baileys';
import { ownerService } from './ownerService';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export class NotificationService {
    private sock: WASocket | undefined;

    /**
     * Initialize with WhatsApp socket
     */
    init(sock: WASocket) {
        this.sock = sock;
    }

    /**
     * Send notification to owner
     */
    async notifyOwner(message: string): Promise<void> {
        if (!this.sock) {
            console.warn('⚠️ NotificationService not initialized');
            return;
        }

        const ownerPhone = ownerService.getOwnerPhone();
        if (!ownerPhone) {
            console.warn('⚠️ OWNER_PHONE_NUMBER not set - cannot send notification');
            return;
        }

        // Normalize phone number (remove +)
        const normalizedPhone = ownerPhone.replace(/[\+\s]/g, '');

        // WhatsApp JID format
        const ownerJid = `${normalizedPhone}@s.whatsapp.net`;

        try {
            await this.sock.sendMessage(ownerJid, { text: message });
            console.log(`📨 Notification sent to owner: "${message.substring(0, 50)}..."`);
        } catch (error) {
            console.error('Failed to send notification to owner:', error);
        }
    }

    /**
     * Send conversation summary (only notification type)
     * This is called after 20 minutes of conversation inactivity
     */
    async sendConversationSummary(summary: string): Promise<void> {
        await this.notifyOwner(summary);
    }
}

export const notificationService = new NotificationService();
