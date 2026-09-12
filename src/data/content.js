const email = 'me@vinisantana.com';
const mailSubject = encodeURIComponent('Interview conversation - Data Engineering / Software Engineering');
const mailBody = encodeURIComponent('Hi Vinicius, I found your career site and would like to schedule a conversation.');

export const profile = {
  name: 'Vinicius Santana',
  title: 'Software & Data Engineer',
  location: 'Brazil, UTC-3',
  email,
  mailto: `mailto:${email}?subject=${mailSubject}&body=${mailBody}`,
  linkedin: 'https://linkedin.com/in/vinsantana',
  github: 'https://github.com/VINIClUS',
  domain: 'https://vinisantana.com',
  resume: '/assets/vinicius-santana-resume.pdf',
  availability: 'Available for remote roles and technical interviews'
};

export const navLinks = [
  { href: '/explore/', label: 'Work' },
  { href: '/about/', label: 'About' },
  { href: '/resume/', label: 'Resume' },
  { href: '/#contact', label: 'Contact' }
];

export const roleFit = [
  {
    title: 'Data Engineering',
    text: 'Pipelines, reconciliation, PostgreSQL models, data-quality checks and operational reporting.'
  },
  {
    title: 'Software Engineering',
    text: 'Backend APIs, automation tooling, testable workflows and maintainable service boundaries.'
  },
  {
    title: 'Platform / DevOps',
    text: 'Linux-first operations, containers, delivery automation, monitoring, runbooks and recovery practices.'
  }
];

export const experience = {
  summary:
    'Experience spanning public-health software and data, Linux infrastructure and operational automation, with measurable improvements to reliability and decision-making.',
  roles: [
    {
      role: 'Health Informatics Analyst & Data Engineer',
      organization: 'Municipality of Presidente Epitácio',
      period: 'Oct 2023 — Present',
      highlights: [
        'Process 21,000+ public-health records each month across municipal and partner facilities.',
        'Reduced claim denial rates from 12%+ to below 1% for eight consecutive submission cycles.',
        'Cut workforce reconciliation from 240+ person-hours to about 4 hours per cycle.',
        'Profiled four legacy systems and corrected 10,000+ records to clear the SIA/SIH backlog.',
        'Use Python, SQL, PostgreSQL, Java and Spring across validation, integration and operational workflows.'
      ]
    },
    {
      role: 'IT Infrastructure & Systems Support Intern',
      organization: 'Municipality of Presidente Epitácio',
      period: 'Nov 2021 — Oct 2023',
      highlights: [
        'Operated nine municipal Proxmox/Linux compute nodes, two backup nodes, 23 LXCs and seven VMs.',
        'Maintained rotating snapshots plus incremental and weekly full backups for clinical and billing systems.',
        'Used Ceph replication for high-availability services and resolved replication failures.'
      ]
    },
    {
      role: 'Business Analyst & Operations Manager',
      organization: 'Irmãos Santana',
      period: 'Feb 2021 — Jan 2026 · Part-time',
      highlights: [
        'Increased profitability by 26% and reduced feed waste by 11% through redesigned controls and workflows.',
        'Built Python automation and MQTT monitoring prototypes for production, inventory, water quality and cost data.'
      ]
    }
  ]
};

export const stackGroups = [
  { title: 'Backend', items: ['Python', 'Java', 'FastAPI', 'Spring', 'Pydantic', 'SQLAlchemy', 'REST/OpenAPI'] },
  { title: 'Data', items: ['SQL', 'PostgreSQL', 'Redis', 'DynamoDB', 'InfluxDB', 'Parquet', 'MinIO/S3'] },
  { title: 'Testing & Quality', items: ['Pytest', 'Hypothesis', 'Testcontainers', 'Ruff', 'Pyright'] },
  { title: 'Platform & Reliability', items: ['AWS', 'Docker', 'Linux', 'Ansible', 'Prometheus', 'Grafana'] },
  { title: 'Frontend', items: ['TypeScript', 'React'] }
];
