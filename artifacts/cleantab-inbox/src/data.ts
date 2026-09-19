// @ts-nocheck
// Exact verbatim function from prompt
const C = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const RE = /^(0[1-9]|[12][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
function checkDigit(g14) {
  let f = 2, s = 0;
  for (let i = 13; i >= 0; i--) {
    const d = f * C.indexOf(g14[i]);
    f = f === 2 ? 1 : 2;
    s += Math.floor(d / 36) + (d % 36);
  }
  return C[(36 - (s % 36)) % 36];
}
function validateGSTIN(raw) {
  const g = raw.toUpperCase().replace(/\s/g, "");
  if (!RE.test(g)) return { ok: false, why: "format" };
  return checkDigit(g.slice(0, 14)) === g[14]
    ? { ok: true } : { ok: false, why: "check digit" };
}

export { validateGSTIN };

export type ReceiptEmail = {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  merchant: string;
  date: string;
  amount: number;
  gst: number;
  gstin: string | null;
  category: string;
  purpose: 'Business' | 'Personal';
  frequency: 'Recurring' | 'One-off';
  flags: string[];
  filed: boolean;
  invoiceNumber: string;
};

// Generates a valid GSTIN for mocking
export function generateValidGSTIN(stateCode: string, pan: string, entityNum: string) {
  const g14 = `${stateCode}${pan}${entityNum}Z`;
  return `${g14}${checkDigit(g14)}`;
}

export const INITIAL_EMAILS: ReceiptEmail[] = [
  {
    id: "rec_001",
    sender: "AWS Billing",
    senderEmail: "no-reply-aws@amazon.com",
    subject: "AWS Invoice for Dec 2023",
    body: "Hello,\n\nPlease find attached your AWS invoice for the period Dec 2023.\n\nTotal: ₹12,450.00\nGST (18%): ₹2,241.00\n\nThanks,\nAmazon Web Services India Private Limited",
    merchant: "Amazon Web Services",
    date: "2024-01-02T10:00:00Z",
    amount: 14691.00,
    gst: 2241.00,
    gstin: generateValidGSTIN("27", "AADCA4146P", "1"),
    category: "Cloud",
    purpose: "Business",
    frequency: "Recurring",
    flags: [],
    filed: false,
    invoiceNumber: "AWS-2023-12-001"
  },
  {
    id: "rec_002",
    sender: "Zomato",
    senderEmail: "noreply@zomato.com",
    subject: "Your order summary from Third Wave Coffee",
    body: "Hi there,\n\nHope you enjoyed your coffee!\n\nOrder total: ₹450.00\nGST: ₹22.50\nTotal Paid: ₹472.50",
    merchant: "Third Wave Coffee",
    date: "2024-01-05T14:30:00Z",
    amount: 472.50,
    gst: 22.50,
    gstin: generateValidGSTIN("29", "AAACT8888R", "1"),
    category: "Food",
    purpose: "Personal",
    frequency: "One-off",
    flags: [],
    filed: false,
    invoiceNumber: "ZOM-992381"
  },
  // Anomaly 1: Duplicate charge - Member 1
  {
    id: "rec_003_a",
    sender: "MakeMyTrip",
    senderEmail: "bookings@makemytrip.com",
    subject: "Flight Confirmation: BLR to DEL",
    body: "Your flight to New Delhi is confirmed.\n\nTotal Fare: ₹8,500\nGST: ₹425\nAmount Charged: ₹8,925",
    merchant: "MakeMyTrip",
    date: "2024-01-10T09:15:00Z",
    amount: 8925.00,
    gst: 425.00,
    gstin: generateValidGSTIN("06", "AAACM8888Q", "1"),
    category: "Travel",
    purpose: "Business",
    frequency: "One-off",
    flags: ["Potential duplicate charge detected for MakeMyTrip (₹8,925)"],
    filed: false,
    invoiceNumber: "MMT-FL-1002"
  },
  // Anomaly 1: Duplicate charge - Member 2
  {
    id: "rec_003_b",
    sender: "MakeMyTrip",
    senderEmail: "bookings@makemytrip.com",
    subject: "Flight Confirmation: BLR to DEL",
    body: "Your flight to New Delhi is confirmed.\n\nTotal Fare: ₹8,500\nGST: ₹425\nAmount Charged: ₹8,925",
    merchant: "MakeMyTrip",
    date: "2024-01-10T09:20:00Z",
    amount: 8925.00,
    gst: 425.00,
    gstin: generateValidGSTIN("06", "AAACM8888Q", "1"),
    category: "Travel",
    purpose: "Business",
    frequency: "One-off",
    flags: ["Potential duplicate charge detected for MakeMyTrip (₹8,925)"],
    filed: false,
    invoiceNumber: "MMT-FL-1003"
  },
  // Anomaly 2: Recurring subscription rising from ₹499 to ₹649
  {
    id: "rec_004",
    sender: "Netflix",
    senderEmail: "receipts@netflix.com",
    subject: "Your Netflix Membership fee has been updated",
    body: "Hello,\n\nYour monthly Netflix subscription has been renewed. Please note the new price.\n\nAmount: ₹649.00\n(Previously ₹499.00)",
    merchant: "Netflix",
    date: "2024-01-12T10:00:00Z",
    amount: 649.00,
    gst: 99.00,
    gstin: generateValidGSTIN("27", "AAACN8888P", "1"),
    category: "SaaS",
    purpose: "Personal",
    frequency: "Recurring",
    flags: ["Subscription price increased from ₹499 to ₹649"],
    filed: false,
    invoiceNumber: "NFLX-01-24"
  },
  // Anomaly 3: Invalid GSTIN
  {
    id: "rec_005",
    sender: "Local Stationers",
    senderEmail: "billing@localstationers.in",
    subject: "Invoice for Office Supplies",
    body: "Dear Customer,\n\nAttached is your invoice for office whiteboards and markers.\n\nTotal: ₹3,200\nGST: ₹576\nTotal Payable: ₹3,776",
    merchant: "Local Stationers",
    date: "2024-01-15T11:45:00Z",
    amount: 3776.00,
    gst: 576.00,
    gstin: "27AAACN8888P1Z9", // Intentional invalid check digit
    category: "Office",
    purpose: "Business",
    frequency: "One-off",
    flags: ["Invalid GSTIN format or check digit"],
    filed: false,
    invoiceNumber: "LS-992"
  },
  // Anomaly 4: Bill charging GST with no GSTIN
  {
    id: "rec_006",
    sender: "Freelance Designer",
    senderEmail: "hello@designer.in",
    subject: "Invoice - UI/UX Assets",
    body: "Hi team,\n\nHere is the invoice for the assets delivered last week.\n\nServices: ₹10,000\nGST: ₹1,800\nTotal: ₹11,800",
    merchant: "Freelance Designer",
    date: "2024-01-18T16:00:00Z",
    amount: 11800.00,
    gst: 1800.00,
    gstin: null, // Intentional missing GSTIN despite charging GST
    category: "Services",
    purpose: "Business",
    frequency: "One-off",
    flags: ["Invoice charges GST (₹1,800) but no GSTIN provided"],
    filed: false,
    invoiceNumber: "INV-2024-01"
  },
  // Pad with 23 more normal records to reach 30 exact
  {
    id: "rec_007", sender: "Airtel", senderEmail: "ebill@airtel.com", subject: "Postpaid Bill Jan 2024", body: "Your mobile bill is ready. Total: ₹1,178 (Inc GST ₹179.69)", merchant: "Bharti Airtel", date: "2024-01-20T08:00:00Z", amount: 1178.00, gst: 179.69, gstin: generateValidGSTIN("07", "AAACB2894G", "1"), category: "Telecom", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "AIR-123"
  },
  {
    id: "rec_008", sender: "WeWork", senderEmail: "billing@wework.co.in", subject: "Invoice for Hot Desk", body: "WeWork invoice. Total: ₹15,000, GST: ₹2,700.", merchant: "WeWork India", date: "2024-01-22T09:00:00Z", amount: 17700.00, gst: 2700.00, gstin: generateValidGSTIN("29", "AAACW8888P", "1"), category: "Coworking", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "WW-1092"
  },
  {
    id: "rec_009", sender: "GitHub", senderEmail: "receipts@github.com", subject: "GitHub Copilot", body: "Monthly Copilot subscription: $10 (approx ₹830).", merchant: "GitHub", date: "2024-01-23T10:00:00Z", amount: 830.00, gst: 0, gstin: null, category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "GH-898"
  },
  {
    id: "rec_010", sender: "Swiggy", senderEmail: "noreply@swiggy.in", subject: "Order from Meghana Foods", body: "Biryani order. Total: ₹850, GST: ₹42.50", merchant: "Meghana Foods", date: "2024-01-24T13:00:00Z", amount: 892.50, gst: 42.50, gstin: generateValidGSTIN("29", "AAACM9999M", "1"), category: "Food", purpose: "Business", frequency: "One-off", flags: [], filed: false, invoiceNumber: "SWG-445"
  },
  {
    id: "rec_011", sender: "Jio", senderEmail: "jiocare@jio.com", subject: "JioFiber Bill", body: "Broadband bill. Total: ₹999 + GST ₹180.", merchant: "Reliance Jio", date: "2024-01-25T08:00:00Z", amount: 1179.00, gst: 180.00, gstin: generateValidGSTIN("27", "AAACJ8888J", "1"), category: "Telecom", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "JIO-221"
  },
  {
    id: "rec_012", sender: "Google Workspace", senderEmail: "workspace@google.com", subject: "G-Suite Monthly", body: "Total: ₹2,100 + GST ₹378", merchant: "Google India", date: "2024-01-26T09:00:00Z", amount: 2478.00, gst: 378.00, gstin: generateValidGSTIN("27", "AAACG8888G", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "GWS-992"
  },
  {
    id: "rec_013", sender: "Ola Cabs", senderEmail: "receipts@olacabs.com", subject: "Ride to Airport", body: "Total fare: ₹1,200 (Inc GST ₹60)", merchant: "Ola", date: "2024-01-27T06:30:00Z", amount: 1200.00, gst: 60.00, gstin: generateValidGSTIN("29", "AAACO8888O", "1"), category: "Travel", purpose: "Business", frequency: "One-off", flags: [], filed: false, invoiceNumber: "OLA-776"
  },
  {
    id: "rec_014", sender: "Razorpay", senderEmail: "billing@razorpay.com", subject: "Payment Gateway Fees", body: "Fees for Jan: ₹5,000 + GST ₹900", merchant: "Razorpay", date: "2024-01-28T10:00:00Z", amount: 5900.00, gst: 900.00, gstin: generateValidGSTIN("29", "AAACR8888R", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "RZP-112"
  },
  {
    id: "rec_015", sender: "Zoom", senderEmail: "billing@zoom.us", subject: "Zoom Pro Monthly", body: "Total: ₹1,300 + GST ₹234", merchant: "Zoom Video", date: "2024-01-29T11:00:00Z", amount: 1534.00, gst: 234.00, gstin: generateValidGSTIN("27", "AAACZ8888Z", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "ZM-334"
  },
  {
    id: "rec_016", sender: "Slack", senderEmail: "billing@slack.com", subject: "Slack Standard", body: "Total: ₹4,000 + GST ₹720", merchant: "Slack", date: "2024-01-30T10:00:00Z", amount: 4720.00, gst: 720.00, gstin: generateValidGSTIN("27", "AAACS8888S", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "SLK-991"
  },
  {
    id: "rec_017", sender: "DigitalOcean", senderEmail: "billing@digitalocean.com", subject: "Droplet Invoice", body: "Total: ₹2,500 + GST ₹450", merchant: "DigitalOcean", date: "2024-01-31T12:00:00Z", amount: 2950.00, gst: 450.00, gstin: generateValidGSTIN("27", "AAACD8888D", "1"), category: "Cloud", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "DO-442"
  },
  {
    id: "rec_018", sender: "Figma", senderEmail: "billing@figma.com", subject: "Figma Professional", body: "Total: ₹1,200 + GST ₹216", merchant: "Figma", date: "2024-02-01T10:00:00Z", amount: 1416.00, gst: 216.00, gstin: generateValidGSTIN("27", "AAACF8888F", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "FIG-110"
  },
  {
    id: "rec_019", sender: "Vercel", senderEmail: "receipts@vercel.com", subject: "Vercel Pro", body: "Total: ₹1,600 + GST ₹288", merchant: "Vercel", date: "2024-02-02T10:00:00Z", amount: 1888.00, gst: 288.00, gstin: generateValidGSTIN("27", "AAACV8888V", "1"), category: "Cloud", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "VER-902"
  },
  {
    id: "rec_020", sender: "Taj Hotels", senderEmail: "reservations@tajhotels.com", subject: "Stay at Taj Lands End", body: "Room charges: ₹12,000 + GST ₹2,160", merchant: "Taj Hotels", date: "2024-02-03T10:00:00Z", amount: 14160.00, gst: 2160.00, gstin: generateValidGSTIN("27", "AAACT8888T", "1"), category: "Travel", purpose: "Business", frequency: "One-off", flags: [], filed: false, invoiceNumber: "TAJ-332"
  },
  {
    id: "rec_021", sender: "Indigo", senderEmail: "booking@goindigo.in", subject: "Flight DEL to BOM", body: "Total Fare: ₹5,000 + GST ₹250", merchant: "Indigo", date: "2024-02-04T10:00:00Z", amount: 5250.00, gst: 250.00, gstin: generateValidGSTIN("07", "AAACI8888I", "1"), category: "Travel", purpose: "Business", frequency: "One-off", flags: [], filed: false, invoiceNumber: "IND-111"
  },
  {
    id: "rec_022", sender: "Starbucks", senderEmail: "receipts@starbucks.in", subject: "Coffee order", body: "Latte: ₹300 + GST ₹15", merchant: "Tata Starbucks", date: "2024-02-05T10:00:00Z", amount: 315.00, gst: 15.00, gstin: generateValidGSTIN("27", "AAACS8888S", "1"), category: "Food", purpose: "Personal", frequency: "One-off", flags: [], filed: false, invoiceNumber: "SBX-998"
  },
  {
    id: "rec_023", sender: "Dunzo", senderEmail: "support@dunzo.in", subject: "Courier pickup", body: "Delivery: ₹150 + GST ₹27", merchant: "Dunzo", date: "2024-02-06T10:00:00Z", amount: 177.00, gst: 27.00, gstin: generateValidGSTIN("29", "AAACD8888D", "1"), category: "Office", purpose: "Business", frequency: "One-off", flags: [], filed: false, invoiceNumber: "DNZ-221"
  },
  {
    id: "rec_024", sender: "HDFC Bank", senderEmail: "alerts@hdfcbank.com", subject: "Account Maintenance Fee", body: "Charges: ₹500 + GST ₹90", merchant: "HDFC Bank", date: "2024-02-07T10:00:00Z", amount: 590.00, gst: 90.00, gstin: generateValidGSTIN("27", "AAACH8888H", "1"), category: "Finance", purpose: "Business", frequency: "One-off", flags: [], filed: false, invoiceNumber: "HDF-991"
  },
  {
    id: "rec_025", sender: "Notion", senderEmail: "team@notion.so", subject: "Notion Team Plan", body: "Total: ₹800 + GST ₹144", merchant: "Notion", date: "2024-02-08T10:00:00Z", amount: 944.00, gst: 144.00, gstin: generateValidGSTIN("27", "AAACN8888N", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "NOT-112"
  },
  {
    id: "rec_026", sender: "Mailchimp", senderEmail: "billing@mailchimp.com", subject: "Monthly Campaign", body: "Total: ₹2,500 + GST ₹450", merchant: "Mailchimp", date: "2024-02-09T10:00:00Z", amount: 2950.00, gst: 450.00, gstin: generateValidGSTIN("27", "AAACM8888M", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "MC-776"
  },
  {
    id: "rec_027", sender: "Canva", senderEmail: "billing@canva.com", subject: "Canva Pro", body: "Total: ₹399 + GST ₹71.82", merchant: "Canva", date: "2024-02-10T10:00:00Z", amount: 470.82, gst: 71.82, gstin: generateValidGSTIN("27", "AAACC8888C", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "CNV-102"
  },
  {
    id: "rec_028", sender: "Uber", senderEmail: "receipts@uber.com", subject: "Trip to Client", body: "Fare: ₹450 (Inc GST ₹22.50)", merchant: "Uber", date: "2024-02-11T10:00:00Z", amount: 450.00, gst: 22.50, gstin: generateValidGSTIN("29", "AAACU8888U", "1"), category: "Travel", purpose: "Business", frequency: "One-off", flags: [], filed: false, invoiceNumber: "UBR-992"
  },
  {
    id: "rec_029", sender: "Freshworks", senderEmail: "billing@freshworks.com", subject: "Freshdesk Monthly", body: "Total: ₹3,000 + GST ₹540", merchant: "Freshworks", date: "2024-02-12T10:00:00Z", amount: 3540.00, gst: 540.00, gstin: generateValidGSTIN("33", "AAACF8888F", "1"), category: "SaaS", purpose: "Business", frequency: "Recurring", flags: [], filed: false, invoiceNumber: "FW-123"
  },
];
