const selectors = {
  authView: document.getElementById('authView'),
  dashboard: document.getElementById('dashboard'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  loginError: document.getElementById('loginError'),
  welcomeText: document.getElementById('welcomeText'),
  logoutBtn: document.getElementById('logoutBtn'),
  metricProperties: document.getElementById('metricProperties'),
  metricLeads: document.getElementById('metricLeads'),
  weeklyChart: document.getElementById('weeklyChart'),
  submissionsList: document.getElementById('submissionsList'),
  propertiesList: document.getElementById('propertiesList'),
  refreshSubmissions: document.getElementById('refreshSubmissions'),
  refreshProperties: document.getElementById('refreshProperties'),
};

const api = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
};

async function bootstrap() {
  try {
    const { user } = await api('/api/auth/me');
    showDashboard(user);
    await Promise.all([loadMetrics(), loadSubmissions(), loadProperties()]);
  } catch (error) {
    selectors.authView.hidden = false;
    selectors.dashboard.hidden = true;
  }
}

function showDashboard(user) {
  selectors.authView.hidden = true;
  selectors.dashboard.hidden = false;
  selectors.welcomeText.textContent = `Welcome back, ${user.name}`;
}

selectors.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  selectors.loginError.textContent = '';

  try {
    const { user } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: selectors.loginEmail.value.trim(),
        password: selectors.loginPassword.value.trim(),
      }),
    });
    showDashboard(user);
    await Promise.all([loadMetrics(), loadSubmissions(), loadProperties()]);
  } catch (error) {
    selectors.loginError.textContent = error.message;
  }
});

selectors.logoutBtn.addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  selectors.dashboard.hidden = true;
  selectors.authView.hidden = false;
});

selectors.refreshSubmissions.addEventListener('click', loadSubmissions);
selectors.refreshProperties.addEventListener('click', loadProperties);

async function loadMetrics() {
  try {
    const { metrics } = await api('/api/dashboard/metrics');
    selectors.metricProperties.textContent = metrics.totalProperties;
    selectors.metricLeads.textContent = metrics.totalSubmissions;
    if (metrics.weeklyInquiries?.length) {
      selectors.weeklyChart.textContent = metrics.weeklyInquiries
        .map(({ week, inquiries }) => `${new Date(week).toLocaleDateString()}: ${inquiries}`)
        .join('\n');
    } else {
      selectors.weeklyChart.textContent = 'No data yet';
    }
  } catch (error) {
    selectors.metricProperties.textContent = '-';
    selectors.metricLeads.textContent = '-';
    selectors.weeklyChart.textContent = 'Unable to load metrics';
  }
}

async function loadSubmissions() {
  try {
    const { submissions } = await api('/api/submissions');
    selectors.submissionsList.innerHTML = submissions.slice(0, 5).map((submission) => `
      <div class="list-item">
        <h4>${submission.name}</h4>
        <p>${submission.email}</p>
        <p class="muted">${submission.message?.slice(0, 100) || 'No message'}</p>
      </div>
    `).join('');
  } catch (error) {
    selectors.submissionsList.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function loadProperties() {
  try {
    const { properties } = await api('/api/properties');
    selectors.propertiesList.innerHTML = properties.slice(0, 5).map((property) => `
      <div class="list-item">
        <h4>${property.title}</h4>
        <p>${property.location} · ${property.type}</p>
        <p class="muted">$${Number(property.price).toLocaleString()}</p>
      </div>
    `).join('');
  } catch (error) {
    selectors.propertiesList.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

bootstrap();

