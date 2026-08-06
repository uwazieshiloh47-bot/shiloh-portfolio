# Shiloh Uwazie — Portfolio

My personal portfolio site. Built from scratch with semantic HTML and hand-written
CSS — no frameworks, no build step.

**Live:** https://uwazieshiloh47-bot.github.io/shiloh-portfolio/

## About me

Computer Science senior at Louisiana State University at Alexandria (B.Sc.
expected August 2027), working toward cloud engineering and DevOps. Currently
studying for the AWS Certified Cloud Practitioner exam.

- Email: uwazieshiloh47@gmail.com
- LinkedIn: https://www.linkedin.com/in/shiloh-uwazie-0843b8411/

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page and featured project |
| `about.html` | Background and goals |
| `work.html` | Project case studies |
| `skills.html` | Skills and certification progress |
| `resume.html` | Web résumé + PDF download |
| `contact.html` | Contact links |
| `404.html` | Not-found page served by GitHub Pages |
| `styles.css` | All styling; design tokens are CSS custom properties in `:root` |
| `documents/` | Résumé PDF served by the site |
| `fonts/` | Self-hosted web fonts |

## Running locally

No dependencies. Start the local server:

```bash
npm start
```

Open `http://localhost:5500`. Port 5500 matches the development origin allowed
by the visitor API's CORS configuration.

## Visitor counter

`visitor-counter.js` records at most one visit per browser tab and displays the
current count in the shared footer. After deploying the visitor API, set
`API_BASE_URL` at the top of that file to the Terraform `api_url` output. Use
only the base URL, without `/visit` or `/count`.

## Accessibility

The site is built to be keyboard- and screen-reader-friendly:

- Skip-to-content link on every page
- Semantic landmarks (`header`, `nav`, `main`, `footer`) and labelled sections
- `aria-current="page"` on the active nav item
- Visible `:focus-visible` indicators on all interactive elements
- Layouts reflow to a single column on narrow screens
- Background animation respects `prefers-reduced-motion`

## Résumé source

The résumé is written in LaTeX. This repo carries only the published PDF the
site links to, `documents/Shiloh-Uwazie-Resume.pdf`. The `.tex` source is kept
outside the repo, so rebuilding the PDF and copying it into `documents/` is a
manual step:

```bash
pdflatex -interaction=nonstopmode SHILOH_UWAZIE_RESUME.tex
```

Résumé template based on [jakeryang/resume](https://github.com/jakeryang/resume) (MIT).
