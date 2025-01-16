# Specification

## Objective

To build an app that fosters incubation of AI products and services. There should be three facets to the application: 
- a collection of projects that are incubated and monitored.
- a research tool that allows users to submit URLs to be crawled, and stores new distinct content and associated metadata at specified intervals. 
- a playground where users can experiment with different aws bedrock endpoints and see how they work. 


Key Requirements
## Core functionalities:

- AI agent that can parse a given site (URL and 'content hints' submitted by user. Hints might look like 'desired content is int the /blog domain') and extract core descriptive content and metadata. 
- Web crawler integration: A background service or script that periodically crawls or consumes APIs from declare sites given the structure of each site as defined by the agent described above.
- Data ingestion & storage: Store crawled data in a suitable database.
- Summarization pipeline: AI to summarize the text and store the summary in the chosen DB. 
- supports different user and adminstrator roles. 
- allows users to submit URLs to be crawled, and stores new distinct content and associated metadata at specified intervals.
- stores user data uniquely: such as their curated research feeds and playgrounds. 
- users can allow their research feeds and playgrounds to be public or private.


## Tech stack:

Frontend: Next.js (React-based framework).
Backend: Next.js API routes (or a separate Node.js server if needed).
Database: A NoSQL store (MongoDB or similar) or a relational DB if desired.
NLP: Could use a Python microservice (FastAPI, Flask) or a Node-based library. Alternatively, integrate with third-party NLP APIs (e.g., Hugging Face Inference API).

## Security & Privacy:

- Properly handle large-scale scraping requests (respect robots.txt, rate limiting).
- Ensure you have permission or abide by fair-use policies.

## Scalability:

- Plan for potentially large volumes of data.
- Automated scheduling for crawls.
- Caching and indexing strategies.




## Functional Requirements
- List and describe each functional requirement.
- Break down complex features into smaller, manageable components.

## Non-Functional Requirements
- Detail each non-functional requirement, explaining its importance.

## User Scenarios and User Flows
- Describe typical user scenarios and provide user flow diagrams.
- Include step-by-step interactions and decision points.

## File Structure Proposal
- Suggest an organized file and directory structure.
- Use markdown files to outline and guide the process.

## Assumptions
- List assumptions made during the specification process.
- Justify each assumption and its impact on the project.

## Reflection
- Justify the inclusion of each requirement.
- Consider potential challenges and propose mitigation strategies.
- Reflect on how each element contributes to the overall project goals.






