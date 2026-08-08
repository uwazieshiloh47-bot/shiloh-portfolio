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
`visitor-counter.js` records at most one visit per browser tab and displays the
current count in the shared footer.
After deploying the visitor API, set
`API_BASE_URL` at the top of that file to the Terraform `api_url` output. Use
only the base URL, without `/visit` or `/count`.

## AWS INFRASTRUCTURE
The private S3 origin, CloudFront distribution, and GitHub Actions deployment
role are defined under `infra/`. Terraform state is stored in the private,
versioned S3 bucket `shiloh-terraform-state-482311061712` under the key
`shiloh-portfolio/prod/terraform.tfstate`.

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

## Résumé
The résumé is written in LaTeX. This repo carries only the published PDF the
site links to, `documents/Shiloh-Uwazie-Resume.pdf`.

Résumé template based on [jakeryang/resume](https://github.com/jakeryang/resume) (MIT).
