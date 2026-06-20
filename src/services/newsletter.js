import { supabase } from '../supabase';

/**
 * Subscribes an email address to the newsletter list.
 * Calls the 'subscribe-newsletter' Supabase Edge Function.
 * @param {string} email - The email address to subscribe.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function subscribeToNewsletter(email, lang = 'CZ') {
  if (!email) {
    throw new Error('Email is required');
  }

  const { data, error } = await supabase.functions.invoke('subscribe-newsletter', {
    body: { email, lang }
  });

  if (error) {
    console.error('Newsletter subscription invocation failed:', error);
    throw new Error(error.message || 'Nepodařilo se přihlásit k newsletteru.');
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return {
    success: true,
    message: data?.message || 'Úspěšně přihlášeno k newsletteru.'
  };
}

/**
 * Fetches all subscribers from the Supabase database.
 * Accessible only by authenticated (admin) users.
 * @returns {Promise<Array>}
 */
export async function fetchSubscribers() {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscribers:', error);
    throw error;
  }

  return data || [];
}

/**
 * Manually deletes (unsubscribes) a subscriber from the local list.
 * @param {string} email 
 */
export async function deleteSubscriber(email) {
  const { error } = await supabase
    .from('newsletter_subscribers')
    .delete()
    .eq('email', email);

  if (error) {
    console.error('Error deleting subscriber:', error);
    throw error;
  }
  return true;
}
