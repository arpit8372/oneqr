'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isConfigured, supabase } from '../lib/supabase';

const profileEmojis = ['🏪', '🍽️', '☕', '✂️', '💇', '🛍️', '🥐', '🌿', '🐾', '🏋️', '📸', '✨'];
const profileImageBucket = 'business-profile-images';
const maxProfileImageSize = 2 * 1024 * 1024;
const profileImageExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const platformDefs = [
  { key: 'whatsapp', kind: 'whatsapp', defaultLabel: 'Chat on WhatsApp' },
  { key: 'google_review', kind: 'google_review', defaultLabel: 'Review us on Google' },
  { key: 'instagram', kind: 'instagram', defaultLabel: 'Instagram' },
  { key: 'website', kind: 'website', defaultLabel: 'Website' },
  { key: 'linkedin', kind: 'custom', defaultLabel: 'LinkedIn' },
  { key: 'youtube', kind: 'custom', defaultLabel: 'YouTube' },
  { key: 'facebook', kind: 'custom', defaultLabel: 'Facebook' },
  { key: 'twitter', kind: 'custom', defaultLabel: 'X (Twitter)' },
  { key: 'menu', kind: 'menu', defaultLabel: 'Menu / Catalog' },
  { key: 'custom', kind: 'custom', defaultLabel: 'More Info' },
];

function isHttpsUrl(value) {
  if (!value || typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function hasValidImageSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  }
  return file.type === 'image/webp'
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

async function saveBusinessProfileImage(client, businessId, form) {
  const file = form.get('profile_image');
  if (!file || (typeof file !== 'string' && file.size === 0)) return;

  const extension = typeof file === 'string' ? null : profileImageExtensions[file.type];
  if (
    !extension ||
    file.size > maxProfileImageSize ||
    !(await hasValidImageSignature(file))
  ) {
    redirect('/dashboard/page?error=image');
  }

  const storage = client.storage.from(profileImageBucket);
  const path = `${businessId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await storage.upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error('saveBusinessProfileImage uploadError:', uploadError);
    redirect(`/dashboard/page?error=image&detail=${encodeURIComponent(uploadError.message)}`);
  }

  const { data: { publicUrl } } = storage.getPublicUrl(path);
  const { error: saveError } = await client.rpc('save_business_profile_image', {
    p_business_id: businessId,
    p_logo_url: publicUrl,
  });
  if (saveError) {
    console.error('saveBusinessProfileImage saveError:', saveError);
    const { error: cleanupError } = await storage.remove([path]);
    if (cleanupError) console.error('saveBusinessProfileImage cleanupError:', cleanupError);
    redirect(`/dashboard/page?error=image&detail=${encodeURIComponent(saveError.message)}`);
  }
}

function formatGenericUrl(input) {
  if (!input || typeof input !== 'string') return '';
  let trimmed = input.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  } else if (trimmed.startsWith('http://')) {
    trimmed = `https://${trimmed.slice(7)}`;
  }
  return trimmed;
}

function formatWhatsAppUrl(input, customMessage = 'Hi! I got your QR code.') {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      if (u.hostname === 'wa.me' || u.hostname === 'api.whatsapp.com') {
        if (!u.searchParams.get('text') && customMessage) {
          u.searchParams.set('text', customMessage);
        }
        return u.toString();
      }
    } catch {}
  }
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  const textParam = customMessage ? `?text=${encodeURIComponent(customMessage)}` : '';
  return `https://wa.me/${digits}${textParam}`;
}

function formatInstagramUrl(input) {
  if (!input || typeof input !== 'string') return '';
  let trimmed = input.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@')) {
    trimmed = trimmed.slice(1);
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (trimmed.includes('instagram.com')) {
      trimmed = `https://${trimmed}`;
    } else {
      trimmed = `https://instagram.com/${trimmed}`;
    }
  }
  return trimmed;
}

function validLinkUrl(kind, value) {
  if (!value) return false;
  if (!isHttpsUrl(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (kind === 'whatsapp') return host === 'wa.me' || host === 'api.whatsapp.com';
    if (kind === 'instagram') return host === 'instagram.com' || host === 'www.instagram.com';
    return true;
  } catch {
    return false;
  }
}

function findExistingLink(links, platformKey) {
  if (!links || !links.length) return null;
  if (platformKey === 'whatsapp') return links.find(l => l.kind === 'whatsapp');
  if (platformKey === 'google_review') return links.find(l => l.kind === 'google_review');
  if (platformKey === 'instagram') return links.find(l => l.kind === 'instagram');
  if (platformKey === 'website') return links.find(l => l.kind === 'website');
  if (platformKey === 'menu') return links.find(l => l.kind === 'menu');
  if (platformKey === 'linkedin') return links.find(l => l.kind === 'custom' && (l.label || '').toLowerCase().includes('linkedin'));
  if (platformKey === 'youtube') return links.find(l => l.kind === 'custom' && (l.label || '').toLowerCase().includes('youtube'));
  if (platformKey === 'facebook') return links.find(l => l.kind === 'custom' && (l.label || '').toLowerCase().includes('facebook'));
  if (platformKey === 'twitter') return links.find(l => l.kind === 'custom' && ((l.label || '').toLowerCase().includes('twitter') || (l.label || '').toLowerCase() === 'x'));
  if (platformKey === 'custom') return links.find(l => l.kind === 'custom' && !['linkedin', 'youtube', 'facebook', 'twitter'].some(k => (l.label || '').toLowerCase().includes(k)));
  return null;
}

export async function authenticate(intent, form) {
  if (!isConfigured()) redirect('/?notice=setup');
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const signup = intent === 'signup';
  if (!email || password.length < 8 || password.length > 128) redirect('/?notice=invalid');

  const client = await supabase();
  if (signup) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) redirect('/?notice=signup-error');
    if (data.session) redirect('/dashboard');
    await setPendingEmail(email);
    redirect('/auth/verify');
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  redirect(error ? '/?notice=login-error' : '/dashboard');
}

async function setPendingEmail(email) {
  (await cookies()).set('oneqr_pending_email', email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth/verify',
    maxAge: 60 * 60,
  });
}

export async function verifySignup(form) {
  const jar = await cookies();
  const email = jar.get('oneqr_pending_email')?.value;
  if (!isConfigured() || !email) redirect('/');
  const token = String(form.get('code') ?? '').trim();
  if (!/^[0-9]{6}$/.test(token)) redirect('/auth/verify?notice=invalid');
  const client = await supabase();
  const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
  if (error || !data.session) redirect('/auth/verify?notice=invalid');
  jar.set('oneqr_pending_email', '', { path: '/auth/verify', maxAge: 0 });
  redirect('/dashboard');
}

export async function resendSignupCode() {
  const email = (await cookies()).get('oneqr_pending_email')?.value;
  if (!isConfigured() || !email) redirect('/');
  const client = await supabase();
  const { error } = await client.auth.resend({ type: 'signup', email });
  redirect(error ? '/auth/verify?notice=resend-error' : '/auth/verify?notice=resent');
}

export async function signOut() {
  if (!isConfigured()) redirect('/');
  const client = await supabase();
  const { error } = await client.auth.signOut({ scope: 'local' });
  redirect(error ? '/dashboard?error=signout' : '/');
}

async function persistPageDraft(client, business, form) {
  let headline = String(form.get('headline') ?? form.get('business_name') ?? business.name ?? 'My Business').trim();
  if (!headline) headline = 'My Business';
  if (headline.length > 100) headline = headline.slice(0, 100);

  let description = String(form.get('description') ?? '').trim();
  if (description.length > 600) description = description.slice(0, 600);

  let rawOffer = String(form.get('offer_text') ?? '').trim();
  if (rawOffer.length > 180) rawOffer = rawOffer.slice(0, 180);
  const offerText = rawOffer;

  let rawSsid = String(form.get('wifi_ssid') ?? '').trim();
  if (rawSsid.length > 32) rawSsid = rawSsid.slice(0, 32);
  const wifiSsid = rawSsid.length > 0 ? rawSsid : null;

  let rawPass = String(form.get('wifi_password') ?? '').trim();
  if (rawPass.length > 64) rawPass = rawPass.slice(0, 64);
  // PostgreSQL check constraint: check (wifi_ssid is not null or wifi_password is null)
  // and check (wifi_password is null or length(wifi_password) between 1 and 64)
  const wifiPassword = (wifiSsid && rawPass.length > 0) ? rawPass : null;

  const pageDetails = {
    headline,
    description,
    offer_text: offerText,
    wifi_ssid: wifiSsid,
    wifi_password: wifiPassword,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: findError } = await client
    .from('customer_pages')
    .select('id')
    .eq('business_id', business.id)
    .maybeSingle();

  if (findError) {
    console.error('persistPageDraft findError:', findError);
    redirect(`/dashboard/page?error=save&detail=${encodeURIComponent(findError.message)}`);
  }

  if (existing) {
    const { error: updateError } = await client.from('customer_pages')
      .update(pageDetails)
      .eq('id', existing.id);

    if (updateError) {
      console.error('persistPageDraft updateError:', updateError);
      redirect(`/dashboard/page?error=save&detail=${encodeURIComponent(updateError.message)}`);
    }
    return existing.id;
  }

  const { data, error: insertError } = await client.from('customer_pages')
    .insert({
      business_id: business.id,
      ...pageDetails,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    console.error('persistPageDraft insertError:', insertError);
    redirect(`/dashboard/page?error=save&detail=${encodeURIComponent(insertError?.message || 'Insert failed')}`);
  }
  return data.id;
}

async function saveCustomerProfileData(client, form) {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) redirect('/');

  // Query existing business to preserve valid IDs, categories and profile_emoji
  const { data: businesses, error: businessLoadError } = await client
    .from('businesses')
    .select('id,name,category,review_url,business_branding(profile_emoji,logo_url)')
    .order('created_at')
    .limit(1);
  if (businessLoadError) {
    console.error('saveCustomerProfileData businessLoadError:', businessLoadError);
    redirect(`/dashboard/page?error=profile&detail=${encodeURIComponent(businessLoadError.message)}`);
  }
  const existingBiz = businesses?.[0];

  let name = String(form.get('business_name') ?? existingBiz?.name ?? 'My Business').trim();
  if (!name) name = 'My Business';
  if (name.length > 100) name = name.slice(0, 100);

  const selectedType = String(form.get('business_type') ?? '');
  const customType = String(form.get('custom_business_type') ?? '').trim();
  let category = selectedType === 'Other' ? (customType || 'Local service') : (selectedType || existingBiz?.category || 'Local service');
  if (category.length > 80) category = category.slice(0, 80);

  const submittedEmoji = String(form.get('profile_emoji') ?? '').trim();
  const existingEmoji = existingBiz?.business_branding?.profile_emoji || existingBiz?.business_branding?.[0]?.profile_emoji;
  const defaultEmoji = submittedEmoji || existingEmoji || profileEmojis[0];
  if (!profileEmojis.includes(defaultEmoji)) {
    redirect('/dashboard/page?error=profile&detail=Choose+a+valid+business+icon.');
  }

  let reviewUrl = String(form.get('review_url') ?? '').trim();
  if (reviewUrl) {
    reviewUrl = formatGenericUrl(reviewUrl);
    if (!isHttpsUrl(reviewUrl)) reviewUrl = '';
  }

  let phone = String(form.get('phone') ?? '').trim();
  if (phone) {
    if (!/^[+0-9(). -]{5,30}$/.test(phone)) {
      phone = phone.replace(/[^0-9+]/g, '');
      if (phone.length < 5 || phone.length > 30) phone = '';
    }
  }

  let email = String(form.get('email') ?? '').trim();
  if (email && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254)) {
    email = '';
  }

  let websiteUrl = String(form.get('website_url') ?? '').trim();
  if (websiteUrl) {
    websiteUrl = formatGenericUrl(websiteUrl);
    if (!isHttpsUrl(websiteUrl)) websiteUrl = '';
  }

  let locationText = String(form.get('location_text') ?? '').trim();
  if (locationText.length > 120) locationText = locationText.slice(0, 120);

  let locationUrl = String(form.get('location_url') ?? '').trim();
  if (locationUrl) {
    locationUrl = formatGenericUrl(locationUrl);
    if (!isHttpsUrl(locationUrl)) locationUrl = '';
  }

  let rpcParams = {
    p_name: name,
    p_category: category,
    p_profile_emoji: defaultEmoji,
    p_review_url: reviewUrl || null,
    p_phone: phone || null,
    p_email: email || null,
    p_website_url: websiteUrl || null,
    p_location_text: locationText || null,
    p_location_url: locationUrl || null,
  };

  let { data: businessId, error: profileError } = await client.rpc('save_business_profile_details', rpcParams);

  // If failed due to database constraint on category in 0001 foundation (e.g. category not in Restaurant/Salon/Other):
  if (profileError && !businessId) {
    console.warn('save_business_profile_details initial attempt failed:', profileError.message);
    rpcParams.p_category = 'Other';
    const retryRes = await client.rpc('save_business_profile_details', rpcParams);
    businessId = retryRes.data;
    profileError = retryRes.error;
  }

  if (!businessId) {
    console.error('save_business_profile_details final error:', profileError);
    redirect(`/dashboard/page?error=profile&detail=${encodeURIComponent(profileError?.message || 'Check database details')}`);
  }

  await saveBusinessProfileImage(client, businessId, form);

  const business = { id: businessId, name, category, review_url: reviewUrl || null };
  const pageId = await persistPageDraft(client, business, form);

  const { data: existingLinks, error: linksError } = await client.from('customer_page_links')
    .select('id,kind,label,url,sort_order,is_visible')
    .eq('page_id', pageId)
    .order('sort_order')
    .order('created_at');

  if (linksError) {
    console.error('linksError:', linksError);
    redirect(`/dashboard/page?error=link&detail=${encodeURIComponent(linksError.message)}`);
  }

  // Process all defined platforms gracefully
  for (const [index, p] of platformDefs.entries()) {
    const existing = findExistingLink(existingLinks, p.key);
    
    // Check if user enabled this platform
    const isChecked = form.get(`enable_${p.key}`) === 'on' 
      || form.get(`visible_${existing?.id}`) === 'on'
      || form.get(`add_${p.key}`) === 'on';

    let customLabel = String(form.get(`label_${p.key}`) ?? form.get(`label_${existing?.id}`) ?? form.get(`new_label_${p.key}`) ?? p.defaultLabel).trim();
    if (!customLabel) customLabel = p.defaultLabel;
    if (customLabel.length > 60) customLabel = customLabel.slice(0, 60);

    let computedUrl = null;
    if (p.key === 'whatsapp') {
      const waPhone = String(form.get('wa_phone') ?? form.get(`url_${existing?.id}`) ?? form.get(`new_url_${p.key}`) ?? '').trim();
      const waMsg = String(form.get('wa_message') ?? 'Hi! I got your QR code.').trim();
      computedUrl = waPhone ? formatWhatsAppUrl(waPhone, waMsg) : null;
    } else if (p.key === 'instagram') {
      const instaInput = String(form.get('insta_handle') ?? form.get(`url_${existing?.id}`) ?? form.get(`new_url_${p.key}`) ?? '').trim();
      computedUrl = instaInput ? formatInstagramUrl(instaInput) : null;
    } else if (p.key === 'google_review') {
      computedUrl = null; // Stored in businesses.review_url
    } else {
      const raw = String(form.get(`url_${p.key}`) ?? form.get(`url_${existing?.id}`) ?? form.get(`new_url_${p.key}`) ?? '').trim();
      computedUrl = raw ? formatGenericUrl(raw) : null;
    }

    const hasValidDestination = p.key === 'google_review' ? Boolean(reviewUrl) : (Boolean(computedUrl) && validLinkUrl(p.kind, computedUrl));
    const shouldBeVisible = hasValidDestination && (isChecked || !existing);

    if (existing) {
      const validUrlToSave = p.key === 'google_review' ? null : (hasValidDestination ? computedUrl : existing.url);
      const { error: updateErr } = await client.from('customer_page_links')
        .update({
          label: customLabel || existing.label,
          url: validUrlToSave,
          is_visible: shouldBeVisible,
        })
        .eq('id', existing.id);
      if (updateErr) {
        console.error('customer_page_links updateErr:', updateErr);
        redirect(`/dashboard/page?error=link&detail=${encodeURIComponent(updateErr.message)}`);
      }
    } else if (shouldBeVisible) {
      const { error: insertErr } = await client.from('customer_page_links').insert({
        page_id: pageId,
        kind: p.kind,
        label: customLabel,
        url: p.key === 'google_review' ? null : computedUrl,
        sort_order: index,
        is_visible: true,
      });
      if (insertErr) {
        console.error('customer_page_links insertErr:', insertErr);
        redirect(`/dashboard/page?error=link&detail=${encodeURIComponent(insertErr.message)}`);
      }
    }
  }

  return { business, pageId };
}

export async function saveCustomerProfile(form) {
  if (!isConfigured()) redirect('/');
  const client = await supabase();
  await saveCustomerProfileData(client, form);
  redirect('/dashboard/page?notice=saved');
}

export async function publishCustomerProfileAndQr(form) {
  if (!isConfigured()) redirect('/');
  const client = await supabase();
  const { business, pageId } = await saveCustomerProfileData(client, form);
  const { data: slug, error: publishError } = await client.rpc('publish_customer_page', { p_page_id: pageId });
  if (publishError || !slug) {
    console.error('publish_customer_page error:', publishError);
    redirect(`/dashboard/page?error=publish&detail=${encodeURIComponent(publishError?.message || 'Publish failed')}`);
  }

  const { data: codes, error: qrLoadError } = await client.from('dynamic_qr_codes')
    .select('id')
    .eq('business_id', business.id)
    .eq('page_id', pageId)
    .eq('status', 'active')
    .order('created_at')
    .limit(1);

  if (qrLoadError) {
    console.error('dynamic_qr_codes load error:', qrLoadError);
    redirect(`/dashboard/page?error=qr&detail=${encodeURIComponent(qrLoadError.message)}`);
  }

  if (!codes?.length) {
    const { error: qrError } = await client.from('dynamic_qr_codes').insert({
      business_id: business.id,
      page_id: pageId,
      name: `${business.name} Main Standee`,
    });
    if (qrError) {
      console.error('dynamic_qr_codes insert error:', qrError);
      redirect(`/dashboard/page?error=qr&detail=${encodeURIComponent(qrError.message)}`);
    }
  }

  redirect('/dashboard/page?notice=published');
}

async function requireSuperAdminClient() {
  if (!isConfigured()) redirect('/?notice=setup');
  const client = await supabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) redirect('/');

  const { data: isSuperAdmin, error } = await client.rpc('is_super_admin');
  if (error) {
    console.error('requireSuperAdminClient error:', error);
    redirect('/dashboard/admin?error=access');
  }
  if (!isSuperAdmin) redirect('/dashboard');
  return client;
}

export async function adminUpdateVendor(form) {
  const client = await requireSuperAdminClient();
  const text = (name) => String(form.get(name) ?? '').trim();
  const vendorQuery = `vendor=${encodeURIComponent(text('tenant_id'))}`;
  const linkIds = form.getAll('link_id');
  const linkLabels = form.getAll('link_label');
  const linkUrls = form.getAll('link_url');
  const linkVisibility = form.getAll('link_visible');
  const links = linkIds.map((id, index) => ({
    link_id: String(id),
    label: String(linkLabels[index] ?? ''),
    url: String(linkUrls[index] ?? ''),
    visible: linkVisibility[index] === 'true',
  }));
  const { error } = await client.rpc('admin_update_vendor', {
    p_tenant_id: text('tenant_id'),
    p_business_id: text('business_id'),
    p_tenant_name: text('tenant_name'),
    p_owner_name: text('owner_name'),
    p_owner_phone: text('owner_phone'),
    p_business_name: text('business_name'),
    p_category: text('category'),
    p_profile_emoji: text('profile_emoji'),
    p_primary_color: text('primary_color'),
    p_phone: text('phone'),
    p_email: text('email'),
    p_website_url: text('website_url'),
    p_review_url: text('review_url'),
    p_location_text: text('location_text'),
    p_location_url: text('location_url'),
    p_headline: text('headline'),
    p_description: text('description'),
    p_offer_text: text('offer_text'),
    p_wifi_ssid: text('wifi_ssid'),
    p_wifi_password: text('wifi_password'),
    p_links: links,
  });
  if (error) {
    console.error('adminUpdateVendor error:', error);
    redirect(`/dashboard/admin?${vendorQuery}&error=save&detail=${encodeURIComponent(error.message)}`);
  }
  redirect(`/dashboard/admin?${vendorQuery}&notice=saved`);
}

export async function adminSetVendorSubscription(form) {
  const client = await requireSuperAdminClient();
  const tenantId = String(form.get('tenant_id') ?? '');
  const vendorQuery = `vendor=${encodeURIComponent(tenantId)}`;
  const months = Number(form.get('months'));
  const status = String(form.get('status') ?? '');
  if (!Number.isInteger(months) || months < 1 || months > 120 || !['active', 'paused'].includes(status)) {
    redirect(`/dashboard/admin?${vendorQuery}&error=subscription`);
  }

  const { error } = await client.rpc('admin_set_vendor_subscription', {
    p_tenant_id: tenantId,
    p_plan_name: String(form.get('plan_name') ?? '').trim(),
    p_months: months,
    p_status: status,
  });
  if (error) {
    console.error('adminSetVendorSubscription error:', error);
    redirect(`/dashboard/admin?${vendorQuery}&error=subscription&detail=${encodeURIComponent(error.message)}`);
  }
  redirect(`/dashboard/admin?${vendorQuery}&notice=subscription`);
}

export async function pauseCustomerPage() {
  if (!isConfigured()) redirect('/');
  const client = await supabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) redirect('/');
  const business = await getOwnedBusiness(client);
  const { error } = await client.from('customer_pages')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('business_id', business.id);
  redirect(error ? '/dashboard/page?error=save' : '/dashboard/page?notice=paused');
}

export async function createQrCode(form) {
  if (!isConfigured()) redirect('/');
  const name = String(form.get('name') ?? '').trim();
  if (!name || name.length > 80) redirect('/dashboard/qr?error=invalid');
  const client = await supabase();
  const business = await getOwnedBusiness(client);
  const { data: page, error: pageError } = await client.from('customer_pages')
    .select('id,status')
    .eq('business_id', business.id)
    .maybeSingle();
  if (pageError || !page || page.status !== 'published') redirect('/dashboard/qr?error=page-required');
  const { error } = await client.from('dynamic_qr_codes').insert({
    business_id: business.id,
    page_id: page.id,
    name,
  });
  redirect(error ? '/dashboard/qr?error=create' : '/dashboard/qr?notice=created');
}

export async function updateQrCodeStatus(form) {
  if (!isConfigured()) redirect('/');
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '');
  if (!['active', 'paused'].includes(status)) redirect('/dashboard/qr?error=update');
  const client = await supabase();
  const business = await getOwnedBusiness(client);
  const { error } = await client.from('dynamic_qr_codes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('business_id', business.id);
  redirect(error ? '/dashboard/qr?error=update' : '/dashboard/qr?notice=updated');
}

async function getOwnedBusiness(client) {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) redirect('/');
  const { data: businesses, error } = await client
    .from('businesses')
    .select('id,name,category,review_url')
    .order('created_at')
    .limit(1);
  if (error) redirect('/dashboard?error=load');
  if (!businesses?.[0]) redirect('/dashboard?error=no-business');
  return businesses[0];
}
