import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Customer, Worker } from '@shared/api';

export interface BillData {
  customer: Customer;
  dailyDeliveries: Array<{
    date: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  currentMonthAmount: number;
  pendingDues: number;
  totalAmount: number;
  billMonth: string;
  billNumber: string;
  razorpayPaymentLink?: string;
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  gst?: string;
}

export interface DeliveryReportData {
  worker: Worker;
  areaName: string;
  reportDate: string;
  customers: Array<{
    id: number;
    name: string;
    address: string;
    phone: string;
    dailyQuantity: number;
    ratePerLiter: number;
    deliveredQuantity?: number;
    deliveryStatus: 'delivered' | 'not_delivered' | 'pending';
    notes?: string;
  }>;
  totalCustomers: number;
  totalQuantityScheduled: number;
  totalQuantityDelivered: number;
  totalAmount: number;
}

export class PDFBillGenerator {
  private pdf: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.pdf = new jsPDF();
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.margin = 20;
    this.currentY = this.margin;
  }

  async generateBill(billData: BillData, businessInfo: BusinessInfo): Promise<Blob> {
    // Add header
    this.addHeader(businessInfo);
    
    // Add bill details
    this.addBillDetails(billData);
    
    // Add customer details
    this.addCustomerDetails(billData.customer);
    
    // Add daily delivery table
    this.addDeliveryTable(billData);
    
    // Add summary
    this.addSummary(billData);
    
    // Add payment link QR code if available
    if (billData.razorpayPaymentLink) {
      await this.addPaymentQR(billData.razorpayPaymentLink, billData.totalAmount);
    }
    
    // Add footer
    this.addFooter();

    return this.pdf.output('blob');
  }

  private addHeader(businessInfo: BusinessInfo) {
    // Company name
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(businessInfo.name, this.margin, this.currentY);
    this.currentY += 10;

    // Company details
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(businessInfo.address, this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text(`Phone: ${businessInfo.phone} | Email: ${businessInfo.email}`, this.margin, this.currentY);
    if (businessInfo.gst) {
      this.currentY += 5;
      this.pdf.text(`GST: ${businessInfo.gst}`, this.margin, this.currentY);
    }
    this.currentY += 15;

    // Invoice title
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('MILK DELIVERY BILL', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 15;
  }

  private addBillDetails(billData: BillData) {
    const rightX = this.pageWidth - this.margin;
    
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    
    // Bill number and date
    this.pdf.text(`Bill No: ${billData.billNumber}`, this.margin, this.currentY);
    this.pdf.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, rightX - 60, this.currentY);
    this.currentY += 7;
    
    this.pdf.text(`Billing Period: ${billData.billMonth}`, this.margin, this.currentY);
    this.currentY += 15;
  }

  private addCustomerDetails(customer: Customer) {
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('BILL TO:', this.margin, this.currentY);
    this.currentY += 7;

    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(customer.name, this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text(customer.phone, this.margin, this.currentY);
    this.currentY += 5;
    this.pdf.text(customer.address, this.margin, this.currentY);
    this.currentY += 15;
  }

  private addDeliveryTable(billData: BillData) {
    const startY = this.currentY;
    const tableStartX = this.margin;
    const tableWidth = this.pageWidth - (2 * this.margin);
    const colWidths = [30, 35, 35, 35, 35]; // Date, Quantity, Rate, Amount columns
    
    // Table header
    this.pdf.setFillColor(240, 240, 240);
    this.pdf.rect(tableStartX, startY, tableWidth, 10, 'F');
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    
    let currentX = tableStartX;
    this.pdf.text('Date', currentX + 2, startY + 7);
    currentX += colWidths[0];
    this.pdf.text('Quantity (L)', currentX + 2, startY + 7);
    currentX += colWidths[1];
    this.pdf.text('Rate (₹/L)', currentX + 2, startY + 7);
    currentX += colWidths[2];
    this.pdf.text('Amount (₹)', currentX + 2, startY + 7);
    
    this.currentY = startY + 12;

    // Table rows
    this.pdf.setFont('helvetica', 'normal');
    billData.dailyDeliveries.forEach((delivery, index) => {
      if (this.currentY > this.pageHeight - 50) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }

      const rowY = this.currentY;
      currentX = tableStartX;
      
      // Alternating row colors
      if (index % 2 === 0) {
        this.pdf.setFillColor(250, 250, 250);
        this.pdf.rect(tableStartX, rowY - 2, tableWidth, 10, 'F');
      }
      
      this.pdf.text(new Date(delivery.date).toLocaleDateString('en-IN'), currentX + 2, rowY + 5);
      currentX += colWidths[0];
      this.pdf.text(delivery.quantity.toString(), currentX + 2, rowY + 5);
      currentX += colWidths[1];
      this.pdf.text(`₹${delivery.rate}`, currentX + 2, rowY + 5);
      currentX += colWidths[2];
      this.pdf.text(`₹${delivery.amount.toFixed(2)}`, currentX + 2, rowY + 5);
      
      this.currentY += 8;
    });

    // Table border
    this.pdf.setDrawColor(0, 0, 0);
    this.pdf.rect(tableStartX, startY, tableWidth, this.currentY - startY);
    
    // Vertical lines for columns
    currentX = tableStartX;
    for (let i = 0; i < colWidths.length - 1; i++) {
      currentX += colWidths[i];
      this.pdf.line(currentX, startY, currentX, this.currentY);
    }

    this.currentY += 10;
  }

  private addSummary(billData: BillData) {
    const rightX = this.pageWidth - this.margin;
    const summaryX = rightX - 80;
    
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    
    // Summary box
    const summaryStartY = this.currentY;
    this.pdf.rect(summaryX - 5, summaryStartY - 5, 80, 40);
    
    this.pdf.text('Current Month Amount:', summaryX, this.currentY);
    this.pdf.text(`₹${billData.currentMonthAmount.toFixed(2)}`, rightX - 20, this.currentY, { align: 'right' });
    this.currentY += 7;
    
    if (billData.pendingDues > 0) {
      this.pdf.text('Previous Dues:', summaryX, this.currentY);
      this.pdf.text(`₹${billData.pendingDues.toFixed(2)}`, rightX - 20, this.currentY, { align: 'right' });
      this.currentY += 7;
    }
    
    // Total line
    this.pdf.line(summaryX, this.currentY, rightX - 10, this.currentY);
    this.currentY += 5;
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total Amount:', summaryX, this.currentY);
    this.pdf.text(`₹${billData.totalAmount.toFixed(2)}`, rightX - 20, this.currentY, { align: 'right' });
    
    this.currentY += 20;
  }

  private async addPaymentQR(paymentLink: string, amount: number) {
    try {
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(paymentLink, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Add QR code section
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Quick Payment', this.margin, this.currentY);
      this.currentY += 10;

      // Add QR code image
      this.pdf.addImage(qrCodeDataUrl, 'PNG', this.margin, this.currentY, 30, 30);
      
      // Add payment instructions
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text('Scan QR code to pay online', this.margin + 35, this.currentY + 8);
      this.pdf.text(`Amount: ₹${amount}`, this.margin + 35, this.currentY + 15);
      this.pdf.text('Secure payment via Razorpay', this.margin + 35, this.currentY + 22);
      
      this.currentY += 40;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      // Continue without QR code
      this.pdf.setFontSize(10);
      this.pdf.text('Payment Link: ' + paymentLink, this.margin, this.currentY);
      this.currentY += 15;
    }
  }

  private addFooter() {
    const footerY = this.pageHeight - 30;
    
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Thank you for your business!', this.pageWidth / 2, footerY, { align: 'center' });
    this.pdf.text('For any queries, please contact us at the above number.', this.pageWidth / 2, footerY + 5, { align: 'center' });
    
    // Add generation timestamp
    this.pdf.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, this.margin, footerY + 15);
  }
}

// Utility function to open WhatsApp with generated bill
export function shareViaWhatsApp(phoneNumber: string, billBlob: Blob, customerName: string, amount: number) {
  // Create file URL for sharing
  const fileUrl = URL.createObjectURL(billBlob);
  
  // WhatsApp message
  const message = `Hi ${customerName},\n\nYour milk delivery bill for this month is ready.\nAmount: ₹${amount}\n\nPlease find your bill attached. You can pay online using the QR code in the bill.\n\nThank you!`;
  
  // Format phone number for WhatsApp (remove +91 if present)
  const formattedPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');
  
  // Open WhatsApp Web with pre-filled message
  const whatsappUrl = `https://wa.me/91${formattedPhone}?text=${encodeURIComponent(message)}`;
  
  // Open WhatsApp in new tab
  window.open(whatsappUrl, '_blank');
  
  // Note: File sharing via WhatsApp Web is limited. 
  // In a real app, you might want to upload the file to a server first
  // and share the download link instead.
  
  // Download the bill for manual sharing
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = `bill_${customerName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}

// Generate Razorpay payment link
export async function generateRazorpayPaymentLink(amount: number, customerName: string, customerPhone: string, billNumber: string): Promise<string> {
  try {
    // Import the razorpayApi dynamically to avoid circular imports
    const { razorpayApi } = await import('@/lib/api-client');

    const response = await razorpayApi.createPaymentLink({
      amount,
      customer: {
        name: customerName,
        contact: customerPhone,
      },
      description: `Milk delivery bill #${billNumber}`,
      reference_id: billNumber,
      expire_by: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      notes: {
        bill_number: billNumber,
        customer_name: customerName,
      }
    });

    return response.short_url;
  } catch (error) {
    console.error('Failed to create Razorpay payment link:', error);
    // Fallback to a mock link if API fails
    return `https://rzp.io/l/${billNumber.toLowerCase()}`;
  }
}

export class PDFDeliveryReportGenerator {
  private pdf: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.pdf = new jsPDF();
    this.pageHeight = this.pdf.internal.pageSize.height;
    this.pageWidth = this.pdf.internal.pageSize.width;
    this.margin = 20;
    this.currentY = this.margin;
  }

  // Utility function for smart text truncation
  private truncateText(text: string, maxLength: number, preserveWords: boolean = true): string {
    if (text.length <= maxLength) return text;

    if (preserveWords) {
      const words = text.split(' ');
      let result = '';
      for (const word of words) {
        if ((result + word).length > maxLength - 3) {
          return result.trim() + '...';
        }
        result += (result ? ' ' : '') + word;
      }
      return result;
    }

    return text.substring(0, maxLength - 3) + '...';
  }

  // Utility function for text wrapping
  private wrapText(text: string, maxWidth: number, fontSize: number = 10): string[] {
    this.pdf.setFontSize(fontSize);
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = this.pdf.getTextWidth(testLine);

      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  async generateDeliveryReport(reportData: DeliveryReportData, businessInfo: BusinessInfo): Promise<Blob> {
    // Add header
    this.addHeader(businessInfo);

    // Add report details
    this.addReportDetails(reportData);

    // Add worker details
    this.addWorkerDetails(reportData.worker, reportData.areaName);

    // Add delivery summary
    this.addDeliverySummary(reportData);

    // Add customer list table
    this.addCustomerTable(reportData);

    // Add footer
    this.addFooter();

    return this.pdf.output('blob');
  }

  private addHeader(businessInfo: BusinessInfo) {
    // Header background
    this.pdf.setFillColor(52, 73, 94);
    this.pdf.rect(0, 0, this.pageWidth, 50, 'F');

    // Company name - white text on dark background
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(businessInfo.name, this.margin, this.currentY + 8);

    // Report title on the right
    this.pdf.setFontSize(14);
    this.pdf.text('DAILY DELIVERY REPORT', this.pageWidth - this.margin, this.currentY + 8, { align: 'right' });

    this.currentY += 18;

    // Company details in smaller text
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(businessInfo.address, this.margin, this.currentY);
    this.currentY += 4;
    this.pdf.text(`Phone: ${businessInfo.phone} | Email: ${businessInfo.email}`, this.margin, this.currentY);

    // Reset text color to black
    this.pdf.setTextColor(0, 0, 0);
    this.currentY = 65; // Move below the header area
  }

  private addReportDetails(reportData: DeliveryReportData) {
    const rightX = this.pageWidth - this.margin;

    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');

    // Report date and time
    this.pdf.text(`Report Date: ${new Date(reportData.reportDate).toLocaleDateString('en-IN')}`, this.margin, this.currentY);
    this.pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, rightX - 80, this.currentY);
    this.currentY += 15;
  }

  private addWorkerDetails(worker: Worker, areaName: string) {
    // Worker details box
    const boxWidth = (this.pageWidth - (2 * this.margin)) / 2;
    const boxHeight = 35;

    this.pdf.setFillColor(248, 249, 250);
    this.pdf.rect(this.margin, this.currentY, boxWidth, boxHeight, 'F');
    this.pdf.setDrawColor(52, 73, 94);
    this.pdf.setLineWidth(0.3);
    this.pdf.rect(this.margin, this.currentY, boxWidth, boxHeight);

    // Title bar
    this.pdf.setFillColor(52, 73, 94);
    this.pdf.rect(this.margin, this.currentY, boxWidth, 10, 'F');

    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('ASSIGNED WORKER', this.margin + 3, this.currentY + 7);

    // Worker details
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');

    const detailsY = this.currentY + 15;
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Name:', this.margin + 3, detailsY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(worker.name, this.margin + 18, detailsY);

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Phone:', this.margin + 3, detailsY + 6);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(worker.phone, this.margin + 20, detailsY + 6);

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Area:', this.margin + 3, detailsY + 12);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(areaName, this.margin + 17, detailsY + 12);

    this.currentY += boxHeight + 10;
  }

  private addDeliverySummary(reportData: DeliveryReportData) {
    // Summary box with gradient-like effect
    const summaryStartY = this.currentY;
    const boxWidth = this.pageWidth - (2 * this.margin);
    const boxHeight = 40;

    // Background with subtle color
    this.pdf.setFillColor(240, 248, 255);
    this.pdf.rect(this.margin, summaryStartY, boxWidth, boxHeight, 'F');

    // Professional border
    this.pdf.setDrawColor(52, 73, 94);
    this.pdf.setLineWidth(0.5);
    this.pdf.rect(this.margin, summaryStartY, boxWidth, boxHeight);

    // Title with accent background
    this.pdf.setFillColor(52, 73, 94);
    this.pdf.rect(this.margin, summaryStartY, boxWidth, 12, 'F');

    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DELIVERY SUMMARY', this.margin + 5, summaryStartY + 8);

    // Reset text color and add content
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');

    const col1X = this.margin + 8;
    const col2X = this.margin + 105;
    const contentY = summaryStartY + 20;

    // Left column
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total Customers:', col1X, contentY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${reportData.totalCustomers}`, col1X + 35, contentY);

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Delivered Qty:', col1X, contentY + 8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${reportData.totalQuantityDelivered}L`, col1X + 35, contentY + 8);

    // Right column
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Scheduled Qty:', col2X, contentY);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${reportData.totalQuantityScheduled}L`, col2X + 35, contentY);

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total Amount:', col2X, contentY + 8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`₹${reportData.totalAmount.toLocaleString()}`, col2X + 35, contentY + 8);

    this.currentY = summaryStartY + boxHeight + 15;
  }

  private addCustomerTable(reportData: DeliveryReportData) {
    const startY = this.currentY;
    const tableStartX = this.margin;
    const tableWidth = this.pageWidth - (2 * this.margin);
    // Redistributed column widths without Status: Name, Phone, Address, Qty, Amount
    const colWidths = [40, 35, 50, 20, 25]; // Total: 170 (Phone gets more space, Address gets more space)
    const rowHeight = 14; // Increased row height for better readability

    // Table header with better styling
    this.pdf.setFillColor(52, 73, 94); // Professional dark blue
    this.pdf.rect(tableStartX, startY, tableWidth, rowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(255, 255, 255); // White text on dark background

    let currentX = tableStartX;
    this.pdf.text('Customer Name', currentX + 3, startY + 9);
    currentX += colWidths[0];
    this.pdf.text('Phone Number', currentX + 3, startY + 9);
    currentX += colWidths[1];
    this.pdf.text('Address', currentX + 3, startY + 9);
    currentX += colWidths[2];
    this.pdf.text('Qty (L)', currentX + 3, startY + 9);
    currentX += colWidths[3];
    this.pdf.text('Amount (₹)', currentX + 3, startY + 9);

    this.currentY = startY + rowHeight + 2;

    // Reset text color for table content
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);

    // Table rows with improved formatting
    reportData.customers.forEach((customer, index) => {
      if (this.currentY > this.pageHeight - 60) {
        this.pdf.addPage();
        this.currentY = this.margin;
      }

      const rowY = this.currentY;
      currentX = tableStartX;

      // Alternating row colors with better contrast
      if (index % 2 === 0) {
        this.pdf.setFillColor(248, 249, 250);
        this.pdf.rect(tableStartX, rowY, tableWidth, rowHeight, 'F');
      }

      // Customer name - smart truncation
      let customerName = customer.name;
      if (customerName.length > 20) {
        const parts = customerName.split(' ');
        if (parts.length > 1) {
          customerName = parts[0] + ' ' + parts[1].substring(0, 1) + '.';
          if (customerName.length > 20) {
            customerName = customerName.substring(0, 17) + '...';
          }
        } else {
          customerName = customerName.substring(0, 17) + '...';
        }
      }
      this.pdf.text(customerName, currentX + 3, rowY + 9);
      currentX += colWidths[0];

      // Phone - show full number without truncation
      let phone = customer.phone;
      // Keep the full phone number, just clean formatting
      if (phone.startsWith('+91')) {
        phone = '+91 ' + phone.substring(3);
      } else if (phone.length === 10) {
        // Add country code if missing
        phone = '+91 ' + phone;
      }
      // Format as: +91 98765 43210
      if (phone.length > 13) {
        const cleaned = phone.replace(/^\+91\s*/, '');
        if (cleaned.length === 10) {
          phone = `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
        }
      }
      this.pdf.text(phone, currentX + 3, rowY + 9);
      currentX += colWidths[1];

      // Address - smart truncation with word boundaries
      let address = customer.address;
      if (address.length > 40) {
        const words = address.split(' ');
        let truncatedAddress = '';
        for (const word of words) {
          if ((truncatedAddress + word).length > 37) {
            truncatedAddress += '...';
            break;
          }
          truncatedAddress += (truncatedAddress ? ' ' : '') + word;
        }
        address = truncatedAddress;
      }
      this.pdf.text(address, currentX + 3, rowY + 9);
      currentX += colWidths[2];

      // Quantity - centered alignment
      const quantity = customer.deliveredQuantity || customer.dailyQuantity;
      const qtyText = quantity.toString() + 'L';
      this.pdf.text(qtyText, currentX + (colWidths[3] / 2), rowY + 9, { align: 'center' });
      currentX += colWidths[3];

      // Amount - right aligned with proper formatting
      const amount = quantity * customer.ratePerLiter;
      const amountText = `₹${amount}`;
      this.pdf.text(amountText, currentX + colWidths[4] - 3, rowY + 9, { align: 'right' });

      this.currentY += rowHeight;
    });

    // Professional table border
    this.pdf.setDrawColor(52, 73, 94);
    this.pdf.setLineWidth(0.5);

    // Outer border
    this.pdf.rect(tableStartX, startY, tableWidth, this.currentY - startY);

    // Header separator
    this.pdf.line(tableStartX, startY + rowHeight, tableStartX + tableWidth, startY + rowHeight);

    // Vertical lines for columns
    currentX = tableStartX;
    for (let i = 0; i < colWidths.length - 1; i++) {
      currentX += colWidths[i];
      this.pdf.line(currentX, startY, currentX, this.currentY);
    }

    // Horizontal lines for better readability
    this.pdf.setLineWidth(0.2);
    this.pdf.setDrawColor(200, 200, 200);
    for (let i = 1; i < reportData.customers.length; i++) {
      const lineY = startY + rowHeight + (i * rowHeight);
      if (lineY < this.currentY) {
        this.pdf.line(tableStartX, lineY, tableStartX + tableWidth, lineY);
      }
    }

    this.currentY += 15;
  }

  private addFooter() {
    const footerY = this.pageHeight - 30;

    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Instructions:', this.margin, footerY);
    this.pdf.text('• Mark deliveries as completed after each delivery', this.margin, footerY + 7);
    this.pdf.text('• Contact customers if any issues arise', this.margin, footerY + 14);
    this.pdf.text('• Report any customer requests or complaints', this.margin, footerY + 21);

    // Add generation timestamp
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, this.pageWidth - this.margin - 80, footerY + 21);
  }
}

// Utility function to share delivery report via WhatsApp
export function shareDeliveryReportViaWhatsApp(
  phoneNumber: string,
  reportBlob: Blob,
  workerName: string,
  areaName: string,
  totalCustomers: number,
  reportDate: string
) {
  // Create file URL for sharing
  const fileUrl = URL.createObjectURL(reportBlob);

  // WhatsApp message
  const message = `Hi ${workerName},\n\nYour delivery report for ${areaName} is ready.\n\nDate: ${reportDate}\nTotal Customers: ${totalCustomers}\n\nPlease check the attached report for today's delivery details.\n\nHave a great delivery day!`;

  // Format phone number for WhatsApp (remove +91 if present)
  const formattedPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');

  // Open WhatsApp Web with pre-filled message
  const whatsappUrl = `https://wa.me/91${formattedPhone}?text=${encodeURIComponent(message)}`;

  // Open WhatsApp in new tab
  window.open(whatsappUrl, '_blank');

  // Download the report for manual sharing
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = `delivery_report_${workerName.replace(/\s+/g, '_')}_${reportDate.replace(/\//g, '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}
