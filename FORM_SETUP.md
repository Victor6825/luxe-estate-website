# Contact Form Setup Guide

## How to Make Your Contact Form Functional

Your contact form is now set up to work with **Formspree** (a free form submission service). Follow these steps to connect it to your email:

### Step 1: Create a Formspree Account
1. Go to https://formspree.io/
2. Sign up for a free account (or sign in if you already have one)
3. Click "New Form" to create a new form endpoint

### Step 2: Get Your Form Endpoint
1. After creating a form, Formspree will give you a unique endpoint URL
2. It will look like: `https://formspree.io/f/YOUR_FORM_ID`
3. Copy this URL

### Step 3: Update Your Form
1. Open `index.html` in your code editor
2. Find the contact form (around line 279)
3. Look for this line:
   ```html
   <form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
4. Replace `YOUR_FORM_ID` with your actual Formspree form ID
5. Save the file

### Step 4: Verify Your Email
1. Formspree will send you a verification email
2. Click the verification link to activate your form
3. After verification, all form submissions will be sent to your email!

### Step 5: Test Your Form
1. Open your website
2. Fill out the contact form
3. Submit it
4. Check your email - you should receive the form submission!

## Alternative: EmailJS (If You Prefer)

If you'd rather use EmailJS instead of Formspree:

1. Sign up at https://www.emailjs.com/
2. Create an email service and template
3. Get your Public Key and Service ID
4. Update the form action and add EmailJS script

## Free Tier Limits

- **Formspree**: 50 submissions/month (free tier)
- **EmailJS**: 200 emails/month (free tier)

Both are perfect for small to medium websites!

## Need Help?

If you provide your email address, I can help you set it up directly in the code.

