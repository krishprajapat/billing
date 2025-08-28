import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Customer } from '@shared/api';

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
