export type TargetCompanySeed = {
  name: string;
  location: string;
  industry: string;
  website: string;
  type: 'faang' | 'product' | 'startup' | 'service' | 'consultancy';
  size: '1-50' | '51-200' | '201-1000' | '1001-5000' | '5000+';
  tier: 1 | 2 | 3;
  targetStatus: 'high_priority' | 'medium_priority' | 'target' | 'low_priority';
  priority: 1 | 2 | 3 | 4 | 5;
  interestScore: 1 | 2 | 3 | 4 | 5;
};

/** Starter targeting list for a software / MERN job search (India + global product). */
export const DEFAULT_TARGET_COMPANIES: TargetCompanySeed[] = [
  { name: 'Google', location: 'Bengaluru / Hyderabad', industry: 'Technology', website: 'https://careers.google.com', type: 'faang', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'Microsoft', location: 'Hyderabad / Bengaluru', industry: 'Technology', website: 'https://careers.microsoft.com', type: 'faang', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'Amazon', location: 'Bengaluru / Hyderabad', industry: 'E-commerce / Cloud', website: 'https://www.amazon.jobs', type: 'faang', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'Meta', location: 'Remote / Bengaluru', industry: 'Social / Technology', website: 'https://www.metacareers.com', type: 'faang', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'Apple', location: 'Hyderabad / Bengaluru', industry: 'Consumer electronics', website: 'https://jobs.apple.com', type: 'faang', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Netflix', location: 'Remote', industry: 'Entertainment', website: 'https://jobs.netflix.com', type: 'faang', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Uber', location: 'Bengaluru / Hyderabad', industry: 'Mobility', website: 'https://www.uber.com/careers', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'LinkedIn', location: 'Bengaluru', industry: 'Professional network', website: 'https://careers.linkedin.com', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Adobe', location: 'Bengaluru / Noida', industry: 'Creative software', website: 'https://careers.adobe.com', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Salesforce', location: 'Hyderabad / Bengaluru', industry: 'CRM / Cloud', website: 'https://careers.salesforce.com', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Oracle', location: 'Bengaluru / Hyderabad', industry: 'Enterprise software', website: 'https://www.oracle.com/careers', type: 'product', size: '5000+', tier: 1, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Atlassian', location: 'Bengaluru / Remote', industry: 'Developer tools', website: 'https://www.atlassian.com/company/careers', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Stripe', location: 'Remote / Bengaluru', industry: 'Fintech', website: 'https://stripe.com/jobs', type: 'product', size: '1001-5000', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'Cloudflare', location: 'Remote', industry: 'Infrastructure', website: 'https://www.cloudflare.com/careers', type: 'product', size: '1001-5000', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Vercel', location: 'Remote', industry: 'Developer tools', website: 'https://vercel.com/careers', type: 'startup', size: '201-1000', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },

  { name: 'Flipkart', location: 'Bengaluru', industry: 'E-commerce', website: 'https://www.flipkartcareers.com', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'Swiggy', location: 'Bengaluru', industry: 'Food / Delivery', website: 'https://careers.swiggy.com', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Zomato', location: 'Gurugram', industry: 'Food / Delivery', website: 'https://www.zomato.com/careers', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'PhonePe', location: 'Bengaluru', industry: 'Fintech', website: 'https://www.phonepe.com/careers', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'Razorpay', location: 'Bengaluru', industry: 'Fintech', website: 'https://razorpay.com/jobs', type: 'product', size: '1001-5000', tier: 1, targetStatus: 'high_priority', priority: 5, interestScore: 5 },
  { name: 'CRED', location: 'Bengaluru', industry: 'Fintech', website: 'https://careers.cred.club', type: 'startup', size: '201-1000', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Groww', location: 'Bengaluru', industry: 'Fintech', website: 'https://groww.in/careers', type: 'product', size: '1001-5000', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Zerodha', location: 'Bengaluru', industry: 'Fintech', website: 'https://careers.zerodha.com', type: 'product', size: '201-1000', tier: 1, targetStatus: 'medium_priority', priority: 3, interestScore: 4 },
  { name: 'Freshworks', location: 'Chennai / Bengaluru', industry: 'SaaS', website: 'https://www.freshworks.com/company/careers', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Zoho', location: 'Chennai / Tenkasi', industry: 'SaaS', website: 'https://www.zoho.com/careers', type: 'product', size: '5000+', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Postman', location: 'Bengaluru / Remote', industry: 'Developer tools', website: 'https://www.postman.com/company/careers', type: 'product', size: '1001-5000', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'BrowserStack', location: 'Mumbai / Remote', industry: 'Developer tools', website: 'https://www.browserstack.com/careers', type: 'product', size: '1001-5000', tier: 1, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Chargebee', location: 'Chennai / Remote', industry: 'SaaS / Billing', website: 'https://www.chargebee.com/careers', type: 'product', size: '1001-5000', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 4 },

  { name: 'Paytm', location: 'Noida', industry: 'Fintech', website: 'https://paytm.com/careers', type: 'product', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Meesho', location: 'Bengaluru', industry: 'E-commerce', website: 'https://careers.meesho.com', type: 'product', size: '1001-5000', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Dream11', location: 'Mumbai', industry: 'Gaming', website: 'https://www.dreamsports.group/careers', type: 'product', size: '1001-5000', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Intuit', location: 'Bengaluru', industry: 'Fintech / Tax', website: 'https://www.intuit.com/careers', type: 'product', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 4, interestScore: 4 },
  { name: 'SAP', location: 'Bengaluru / Gurgaon', industry: 'Enterprise software', website: 'https://jobs.sap.com', type: 'product', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'ServiceNow', location: 'Hyderabad', industry: 'Enterprise software', website: 'https://careers.servicenow.com', type: 'product', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Shopify', location: 'Remote', industry: 'E-commerce', website: 'https://www.shopify.com/careers', type: 'product', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 4, interestScore: 4 },
  { name: 'GitHub', location: 'Remote', industry: 'Developer tools', website: 'https://github.com/about/careers', type: 'product', size: '1001-5000', tier: 2, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'Notion', location: 'Remote', industry: 'Productivity', website: 'https://www.notion.so/careers', type: 'startup', size: '201-1000', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 4 },
  { name: 'Figma', location: 'Remote', industry: 'Design tools', website: 'https://www.figma.com/careers', type: 'product', size: '1001-5000', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 4 },
  { name: 'Thoughtworks', location: 'Bengaluru / Pune', industry: 'Consultancy', website: 'https://www.thoughtworks.com/careers', type: 'consultancy', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 4 },
  { name: 'Publicis Sapient', location: 'Bengaluru / Gurgaon', industry: 'Consultancy', website: 'https://www.publicissapient.com/careers', type: 'consultancy', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Walmart Global Tech', location: 'Bengaluru', industry: 'Retail / Technology', website: 'https://careers.walmart.com', type: 'product', size: '5000+', tier: 2, targetStatus: 'high_priority', priority: 4, interestScore: 4 },
  { name: 'JPMorgan Chase', location: 'Bengaluru / Hyderabad / Mumbai', industry: 'Banking / Technology', website: 'https://careers.jpmorgan.com', type: 'product', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 4, interestScore: 4 },
  { name: 'Goldman Sachs', location: 'Bengaluru / Hyderabad', industry: 'Banking / Technology', website: 'https://www.goldmansachs.com/careers', type: 'product', size: '5000+', tier: 2, targetStatus: 'medium_priority', priority: 4, interestScore: 4 },

  { name: 'Infosys', location: 'Bengaluru / Pune / Hyderabad', industry: 'IT services', website: 'https://www.infosys.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 2, interestScore: 2 },
  { name: 'TCS', location: 'Pan India', industry: 'IT services', website: 'https://www.tcs.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 2, interestScore: 2 },
  { name: 'Wipro', location: 'Bengaluru / Hyderabad', industry: 'IT services', website: 'https://careers.wipro.com', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 2, interestScore: 2 },
  { name: 'Accenture', location: 'Bengaluru / Pune / Hyderabad', industry: 'IT services', website: 'https://www.accenture.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Cognizant', location: 'Chennai / Bengaluru / Pune', industry: 'IT services', website: 'https://careers.cognizant.com', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 2, interestScore: 2 },
  { name: 'Capgemini', location: 'Bengaluru / Pune / Mumbai', industry: 'IT services', website: 'https://www.capgemini.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 2, interestScore: 2 },
  { name: 'HCLTech', location: 'Noida / Chennai / Bengaluru', industry: 'IT services', website: 'https://www.hcltech.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 2, interestScore: 2 },
  { name: 'IBM', location: 'Bengaluru / Pune', industry: 'IT services / Cloud', website: 'https://www.ibm.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'Deloitte', location: 'Hyderabad / Bengaluru / Mumbai', industry: 'Consultancy', website: 'https://www.deloitte.com/careers', type: 'consultancy', size: '5000+', tier: 3, targetStatus: 'medium_priority', priority: 3, interestScore: 3 },
  { name: 'LTIMindtree', location: 'Bengaluru / Pune / Mumbai', industry: 'IT services', website: 'https://www.ltimindtree.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'low_priority', priority: 2, interestScore: 2 },
  { name: 'Persistent Systems', location: 'Pune / Nagpur', industry: 'IT services', website: 'https://www.persistent.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 2, interestScore: 2 },
  { name: 'Tech Mahindra', location: 'Pune / Hyderabad / Bengaluru', industry: 'IT services', website: 'https://careers.techmahindra.com', type: 'service', size: '5000+', tier: 3, targetStatus: 'low_priority', priority: 2, interestScore: 2 },
  { name: 'Nagarro', location: 'Gurugram / Remote', industry: 'IT services', website: 'https://www.nagarro.com/careers', type: 'service', size: '5000+', tier: 3, targetStatus: 'target', priority: 3, interestScore: 3 },
];
