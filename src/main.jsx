import React, { StrictMode, useEffect, useId, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  caseNotes,
  experience,
  heroChips,
  impactMetrics,
  navLinks,
  profile,
  projects,
  roleFit,
  stackGroups
} from './data/content.js';
import './styles.css';

const externalProps = {
  target: '_blank',
  rel: 'noreferrer noopener'
};

function ExternalLink({ href, children, className, ariaLabel }) {
  return (
    <a href={href} className={className} aria-label={ariaLabel} {...externalProps}>
      {children}
    </a>
  );
}

function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    document.body.classList.toggle('nav-open', isOpen);

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('nav-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="site-header">
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" onClick={closeMenu} aria-label="Vinicius Santana home">
          <span className="brand-mark" aria-hidden="true">
            VS
          </span>
          <span>{profile.name}</span>
        </a>

        <button
          className="menu-toggle"
          type="button"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          aria-controls={menuId}
          onClick={() => setIsOpen((value) => !value)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <div className="nav-panel" id={menuId} data-open={isOpen}>
          <ul className="nav-links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={closeMenu}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="nav-actions">
            <ExternalLink className="button button-ghost" href={profile.github} ariaLabel="View Vinicius Santana on GitHub">
              View GitHub
            </ExternalLink>
            <a className="button button-small" href={profile.mailto}>
              Contact me
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero section" id="top" aria-labelledby="hero-title">
      <div className="shell hero-grid">
        <div className="hero-content">
          <p className="eyebrow">Open to Data Engineering & Software Engineering roles</p>
          <h1 id="hero-title">I build data pipelines, APIs and automation that make operations more reliable.</h1>
          <p className="hero-lede">
            Brazil-based engineer focused on PostgreSQL, Python, FastAPI, Go and DevOps practices, with hands-on work in
            public-health data reconciliation, backend services and operational tooling.
          </p>
          <div className="hero-actions" aria-label="Primary actions">
            <a className="button" href={profile.mailto}>
              Contact me
            </a>
            <a className="button button-secondary" href="#projects">
              View projects
            </a>
            <a className="button button-ghost" href={profile.resume} download>
              Download resume
            </a>
          </div>
          <ul className="chip-list" aria-label="Core technologies and domains">
            {heroChips.map((chip) => (
              <li key={chip}>{chip}</li>
            ))}
          </ul>
        </div>

        <aside className="hero-visual" aria-label="Professional portrait and availability">
          <figure className="portrait-card">
            <picture>
              <source media="(min-width: 780px)" srcSet="/assets/images/vinicius-hero-desktop.avif" type="image/avif" />
              <source media="(min-width: 780px)" srcSet="/assets/images/vinicius-hero-desktop.webp" type="image/webp" />
              <source srcSet="/assets/images/vinicius-portrait-mobile.avif" type="image/avif" />
              <source srcSet="/assets/images/vinicius-portrait-mobile.webp" type="image/webp" />
              <img
                src="/assets/images/vinicius-portrait-mobile.jpg"
                alt="Professional portrait of Vinicius Santana"
                width="1600"
                height="900"
                decoding="async"
                fetchPriority="high"
              />
            </picture>
            <figcaption className="availability-card">
              <span className="status-dot" aria-hidden="true" />
              {profile.location} · {profile.availability}
            </figcaption>
          </figure>
        </aside>
      </div>
    </section>
  );
}

function RoleFit() {
  return (
    <section className="role-fit section-tight" aria-labelledby="role-fit-title">
      <div className="shell role-fit-grid">
        <div className="role-fit-heading">
          <p className="eyebrow">Recruiter summary</p>
          <h2 id="role-fit-title">Clear fit for data-heavy product, backend and operations teams.</h2>
        </div>
        <div className="role-fit-cards">
          {roleFit.map((item) => (
            <article className="role-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Impact() {
  return (
    <section className="impact section-tight" aria-labelledby="impact-title">
      <div className="shell">
        <div className="section-heading section-heading-inline">
          <p className="eyebrow">Measured work</p>
          <h2 id="impact-title">Evidence of practical impact, not template claims.</h2>
        </div>
        <div className="impact-grid">
          {impactMetrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <strong>{metric.value}</strong>
              <h3>{metric.label}</h3>
              <p>{metric.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="section" id="about" aria-labelledby="about-title">
      <div className="shell about-grid">
        <div className="about-copy">
          <p className="eyebrow">About</p>
          <h2 id="about-title">I work where data quality, backend systems and operations meet.</h2>
          <p>
            I’m Vinicius Santana, a Data Engineer and Software Engineer based in Brazil. My work is about replacing fragile
            manual routines with software that is observable, repeatable and easier to maintain.
          </p>
          <p>
            The strongest examples are in public-health operations: reconciliation pipelines, validation rules, backend APIs,
            scripts, runbooks and infrastructure workflows that keep reporting, billing and operational data under control.
          </p>
          <div className="availability-note" role="note">
            <strong>{profile.location}.</strong> Available for remote opportunities and technical interviews.
          </div>
        </div>
        <figure className="about-image">
          <picture>
            <source srcSet="/assets/images/vinicius-about.avif" type="image/avif" />
            <source srcSet="/assets/images/vinicius-about.webp" type="image/webp" />
            <img
              src="/assets/images/vinicius-about.jpg"
              alt="Professional portrait of Vinicius Santana in a work-focused setting"
              width="900"
              height="1125"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </figure>
      </div>
    </section>
  );
}

function Experience() {
  return (
    <section className="section section-muted" id="experience" aria-labelledby="experience-title">
      <div className="shell experience-grid">
        <div className="section-heading sticky-heading">
          <p className="eyebrow">Experience</p>
          <h2 id="experience-title">Public-health data and software work in production-like operational contexts.</h2>
          <p>{experience.summary}</p>
        </div>
        <article className="timeline-card">
          <div className="timeline-meta">
            <span>{experience.period}</span>
            <span>{experience.organization}</span>
          </div>
          <h3>{experience.role}</h3>
          <ul className="check-list">
            {experience.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section className="section" id="projects" aria-labelledby="projects-title">
      <div className="shell">
        <div className="section-heading">
          <p className="eyebrow">Featured projects</p>
          <h2 id="projects-title">Concrete technical work with visible scope, constraints and tradeoffs.</h2>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <p className="project-eyebrow">{project.eyebrow}</p>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <ul className="proof-list" aria-label={`${project.title} proof points`}>
                {project.proof.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <ul className="tech-list" aria-label={`${project.title} stack`}>
                {project.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="project-actions">
                {project.links.map((link) =>
                  link.external ? (
                    <ExternalLink className="text-link" href={link.href} key={link.label}>
                      {link.label}
                    </ExternalLink>
                  ) : (
                    <a className="text-link" href={link.href} key={link.label}>
                      {link.label}
                    </a>
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CaseNotes() {
  return (
    <section className="section section-muted" aria-labelledby="case-notes-title">
      <div className="shell">
        <div className="section-heading">
          <p className="eyebrow">Technical notes</p>
          <h2 id="case-notes-title">How the projects map to engineering judgment.</h2>
        </div>
        <div className="case-grid">
          {caseNotes.map((note) => (
            <article className="case-card" id={note.id} key={note.id} tabIndex="-1">
              <h3>{note.title}</h3>
              <p className="case-context">{note.context}</p>
              <ul className="check-list compact">
                {note.approach.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="case-outcome">{note.outcome}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stack() {
  return (
    <section className="section" id="stack" aria-labelledby="stack-title">
      <div className="shell">
        <div className="section-heading">
          <p className="eyebrow">Stack</p>
          <h2 id="stack-title">Tools I use to move from raw data and operational needs to maintainable software.</h2>
        </div>
        <div className="stack-grid">
          {stackGroups.map((group) => (
            <article className="stack-card" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="section contact-section" id="contact" aria-labelledby="contact-title">
      <div className="shell contact-card">
        <div>
          <p className="eyebrow">Contact</p>
          <h2 id="contact-title">Let’s build reliable systems.</h2>
          <p>
            I’m open to conversations about Data Engineering, Software Engineering, backend APIs, public-health systems,
            data platforms and DevOps-enabled products.
          </p>
        </div>
        <div className="contact-actions" aria-label="Contact links">
          <a className="button" href={profile.mailto}>
            Email {profile.email}
          </a>
          <ExternalLink className="button button-secondary" href={profile.linkedin} ariaLabel="Open Vinicius Santana on LinkedIn">
            LinkedIn
          </ExternalLink>
          <ExternalLink className="button button-ghost" href={profile.github} ariaLabel="Open Vinicius Santana on GitHub">
            GitHub
          </ExternalLink>
          <a className="button button-ghost" href={profile.resume} download>
            Download resume
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <p>© 2026 Vinicius Santana. Built as a static React + Vite site and hosted on GitHub Pages.</p>
        <ul aria-label="Footer links">
          <li>
            <ExternalLink href={profile.github}>GitHub</ExternalLink>
          </li>
          <li>
            <ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
          </li>
          <li>
            <a href={profile.mailto}>Email</a>
          </li>
          <li>
            <a href={profile.resume} download>
              Resume
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <RoleFit />
        <Impact />
        <About />
        <Experience />
        <Projects />
        <CaseNotes />
        <Stack />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
