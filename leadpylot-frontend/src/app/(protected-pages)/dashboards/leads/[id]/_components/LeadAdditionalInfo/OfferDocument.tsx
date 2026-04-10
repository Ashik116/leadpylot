import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import dayjs from 'dayjs';

// Define styles for PDF document
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #eaeaea',
    paddingBottom: 10,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLogo: {
    width: 120,
  },
  headerRight: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1e3a8a',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
    color: '#1e3a8a',
  },
  section: {
    marginBottom: 15,
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
  },
  value: {
    width: '60%',
  },
  addressBlock: {
    marginBottom: 15,
  },
  footer: {
    marginTop: 30,
    borderTop: '1px solid #eaeaea',
    paddingTop: 10,
    fontSize: 10,
    textAlign: 'center',
    color: '#6b7280',
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
  },
  bankDetails: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

// Define the types for the component props

import { Offer, TLead } from '@/services/LeadsService';

interface OfferDocumentProps {
  offer: Offer;
  lead: TLead;
}

// Create the PDF document component
const OfferDocument: React.FC<OfferDocumentProps> = ({ offer, lead }) => {
  const formattedDate = dayjs(offer?.createdAt || new Date()).format('MMMM D, YYYY');

  return (
    <Document>
      <Page size="A4" style={styles?.page}>
        {/* Header */}
        <View style={styles?.header}>
          <View>
            {/* Placeholder for logo - you may replace with an actual logo import */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/img/logo/logo-dark-full.png" style={styles?.headerLogo} />
          </View>
          <View style={styles?.headerRight}>
            <Text>Offer ID: {offer?._id}</Text>
            <Text>Date: {formattedDate}</Text>
          </View>
        </View>

        {/* Title */}
        <View>
          <Text style={styles?.title}>Investment Offer</Text>
        </View>

        {/* Client Information */}
        <View style={styles?.section}>
          <Text style={styles?.subTitle}>Client Information</Text>
          <View style={styles?.addressBlock}>
            <Text>{lead?.contact_name}</Text>
            <Text>Email: {lead?.email_from}</Text>
            {lead?.phone && <Text>Phone: {lead?.phone}</Text>}
          </View>
        </View>

        {/* Offer Details */}
        <View style={styles?.section}>
          <Text style={styles?.subTitle}>Offer Details</Text>

          <View style={styles?.infoRow}>
            <Text style={styles?.label}>Investment Amount:</Text>
            <Text style={styles?.value}>
              {typeof offer?.investment_volume === 'number'
                ? offer?.investment_volume?.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })
                : offer?.investment_volume}
            </Text>
          </View>

          <View style={styles?.infoRow}>
            <Text style={styles?.label}>Rate:</Text>
            <Text style={styles?.value}>{offer?.interest_rate}%</Text>
          </View>

          {offer?.payment_terms && (
            <View style={styles?.infoRow}>
              <Text style={styles?.label}>Payment Terms:</Text>
              <Text style={styles?.value}>{offer?.payment_terms?.name}</Text>
            </View>
          )}

          {offer?.payment_terms?.info?.info?.months && (
            <View style={styles?.infoRow}>
              <Text style={styles?.label}>Duration:</Text>
              <Text style={styles?.value}>{offer?.payment_terms?.info?.info?.months} months</Text>
            </View>
          )}

          {offer?.bonus_amount && (
            <View style={styles?.infoRow}>
              <Text style={styles?.label}>Bonus Amount:</Text>
              <Text style={styles?.value}>{offer?.bonus_amount?.Amount}</Text>
            </View>
          )}
        </View>

        {/* Bank Information */}
        {offer?.bank && (
          <View style={styles?.section}>
            <Text style={styles?.subTitle}>Bank Details</Text>
            <View style={styles?.bankDetails}>
              <View style={styles?.infoRow}>
                <Text style={styles?.label}>Bank Name:</Text>
                <Text style={styles?.value}>{offer?.bank?.name}</Text>
              </View>
              <View style={styles?.infoRow}>
                <Text style={styles?.label}>Account Number:</Text>
                <Text style={styles?.value}>{offer?.bank?.account_number}</Text>
              </View>
              <View style={styles?.infoRow}>
                <Text style={styles?.label}>IBAN:</Text>
                <Text style={styles?.value}>{offer?.bank?.iban}</Text>
              </View>
              <View style={styles?.infoRow}>
                <Text style={styles?.label}>SWIFT Code:</Text>
                <Text style={styles?.value}>{offer?.bank?.swift_code}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Terms and Conditions */}
        <View style={styles?.section}>
          <Text style={styles?.subTitle}>Terms and Conditions</Text>
          <Text>
            This offer is valid for 30 days from the issue date. Please review all details carefully
            before proceeding with your investment.
          </Text>
          <Text style={styles?.disclaimer}>
            Disclaimer: The investment returns mentioned in this offer are projections based on
            current market conditions. Actual returns may vary. Please consult with your financial
            advisor before making any investment decisions.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles?.footer} fixed>
          <Text>© {new Date().getFullYear()} LeadPylot. All rights reserved.</Text>
          <Text>This document is generated automatically and is valid without a signature.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default OfferDocument;
