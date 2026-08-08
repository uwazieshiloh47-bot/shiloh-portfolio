# MY PORTFOLIO
My personal portfolio site. Built from scratch with semantic HTML and hand-written
CSS, no frameworks, no build step.

**Live:** https://dk7omuhbtlkuj.cloudfront.net/

## ABOUT ME
Computer Science senior at Louisiana State University at Alexandria, working toward cloud engineering and DevOps.
I am proficient in mainly Python & GO, among others of course.
Currently studying for the AWS Certified Cloud Practitioner exam.

- Email: uwazieshiloh47@gmail.com
- LinkedIn: https://www.linkedin.com/in/shiloh-uwazie-0843b8411/
- GitHub: ???

## STRUCTURE
------------------------------------------------------------------------------------
|      Path      |                          Purpose                                |
|      ---       |                            ---                                  |
| `index.html`   |         Landing page and featured project                       |
| `about.html`   |                 Background and goals                            |
| `work.html`    |                 Project case studies                            |
| `skills.html`  |         Skills and certification progress                       |
| `resume.html`  |               Web résumé + PDF download                         |
| `contact.html` |                     Contact links                               |
| `404.html`     |           Not-found page served by CloudFront                   |
| `sitemap.xml`  |         Canonical page list for search crawlers                  |
| `robots.txt`   |       Crawler access rules and sitemap location                  |
| `social-preview.png` |        Social-sharing preview image                     |
| `seo.test.mjs` |           Source-level SEO regression tests                    |
| `accessibility.test.mjs` | Source-level accessibility regression tests          |
| `performance.test.mjs` | Static-asset budgets and loading-hint tests             |
| `styles.css`   | All styling; design tokens are CSS custom properties in `:root` |
| `documents/`   |              Résumé PDF served by the site                      |
| `fonts/`       |                  Self-hosted web fonts                          |
------------------------------------------------------------------------------------

## RUNS LOCALLY
No dependencies. Start the local server:

```bash
npm start

```
Open `http://localhost:5500`. Port 5500 matches the development origin allowed
by the visitor API's CORS configuration.

## VISITOR COUNTER
`visitor-counter.js` normally records one successful visit per browser tab
session and displays the approximate total in the shared footer. Refreshes and
page navigation in the same tab use the read-only count endpoint after the
first successful visit. New tabs, browsers, devices, blocked browser storage,
bots, and direct API calls can add more visits, so the total is not a count of
unique people.
After deploying the visitor API, set
`API_BASE_URL` at the top of that file to the Terraform `api_url` output. Use
only the base URL, without `/visit` or `/count`.

## AWS INFRASTRUCTURE
The private S3 origin, CloudFront distribution, and GitHub Actions deployment
role are defined under `infra/`. Terraform state is stored in the private,
versioned S3 bucket `shiloh-terraform-state-482311061712` under the key
`shiloh-portfolio/prod/terraform.tfstate`.

The deployment assigns explicit UTF-8 content types and file-specific cache
policies. HTML and crawler files revalidate in browsers while CloudFront can
cache them for five minutes. CSS and JavaScript use a one-hour browser cache.
Images, fonts, and the resume PDF use a one-week browser cache. CloudFront may
retain code and static assets for one year, and every deployment invalidates
the distribution before running the live smoke tests.

CloudFront adds a site-specific Content Security Policy, denies unused browser
capabilities through Permissions Policy, prevents framing, requires HTTPS,
disables MIME sniffing, and limits referrer information. The CSP permits
same-origin site assets and the visitor API connection only.

Authenticate the current PowerShell session before running Terraform commands:

```powershell
aws sso login --profile portfolio-dev
$env:AWS_PROFILE = "portfolio-dev"
terraform -chdir=infra init
terraform -chdir=infra plan
```

## ACCESSIBILITY
The site is built to be keyboard & screen reader friendly:
- Skip-to-content link on every page
- Semantic landmarks (`header`, `nav`, `main`, `footer`) and labelled sections
- `aria-current="page"` on the active nav item
- Visible `:focus-visible` indicators on all interactive elements
- Layouts reflow to a single column on narrow screens
- Background animation respects `prefers-reduced-motion`
- Playwright and axe-core check every public page for automated WCAG 2.0 and
  2.1 Level A and AA violations after deployment
- Above-the-fold decorative fonts are preloaded, and source tests enforce
  static-asset size budgets
- Production smoke tests run in Chromium, Firefox, and WebKit, with explicit
  phone, tablet, and desktop overflow checks

## Résumé
The résumé is written in LaTeX. This repo carries only the published PDF the
site links to, `documents/Shiloh-Uwazie-Resume.pdf`.

Résumé template based on [jakeryang/resume](https://github.com/jakeryang/resume) (MIT).
