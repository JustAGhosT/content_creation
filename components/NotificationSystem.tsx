import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Notification {
  type: string;
  message: string;
}

const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('/api/notifications');
        setNotifications(response.data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchNotifications();
  }, []);

  const sendNotification = async (type: string, message: string) => {
    try {
      const response = await axios.post('/api/notifications', { type, message });
      setNotifications([...notifications, response.data]);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Notification System</h2>
      {error && <p>Error: {error}</p>}
      <div>
        <h3>Send Notification</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const { type, message } = e.target.elements;
            sendNotification(type.value, message.value);
          }}
        >
          <div>
            <label htmlFor="type">Type</label>
            <select id="type" name="type" required>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div>
            <label htmlFor="message">Message</label>
            <textarea id="message" name="message" required></textarea>
          </div>
          <button type="submit">Send</button>
        </form>
      </div>
      <div>
        <h3>Notifications</h3>
        <ul>
          {notifications.map((notification, index) => (
            <li key={index}>
              <strong>{notification.type}:</strong> {notification.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NotificationSystem;
