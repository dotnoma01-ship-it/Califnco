/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from './admin/firebase';
import type { ServiceRequestCategory } from './admin/types';
import { FLUTTER_FILES_SEGMENT_8 } from './dealerFlutterCode';
import { FLUTTER_FILES_SEGMENT_9 } from './dealerBulkOrderFlutterCode';
import { FLUTTER_FILES_SEGMENT_10 } from './serviceBookingFlutterCode';
import { FLUTTER_FILES_SEGMENT_11 } from './notificationsLocationFlutterCode';
import { OpenStreetMapPicker, type LatLngPoint } from './OpenStreetMapPicker';
import {
  fetchConfiguredScheduleSlots,
  setFirestoreScheduleConfigForTesting,
  submitMobileServiceBooking,
  subscribeCustomerServiceRequests,
  validateMobileServiceBookingForm,
  type MobileServiceBookingRecord,
  type ScheduleLookupResult,
} from './mobileServiceBookingService';
import {
  attachForegroundFcmListener,
  DEMO_PREVIEW_NOTIFICATIONS,
  emitTrustedAdminOrderNotificationForTesting,
  inspectWebFcmStatus,
  markAllUserNotificationsAsRead,
  markUserNotificationAsRead,
  requestWebNotificationPermissionAndSync,
  revokeWebDeviceTokenOnSignOut,
  saveUserDeliveryAddress,
  subscribeUserDeliveryAddresses,
  subscribeUserNotifications,
  validateDeliveryLocationForm,
  type LocationCaptureSource,
  type MobileNotificationItem,
  type SavedDeliveryLocationRecord,
  type WebFcmStatusSnapshot,
} from './mobileNotificationsLocationService';
import {
  Droplets,
  ArrowRight,
  ShieldCheck,
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Code2,
  Copy,
  Check,
  Lock,
  Mail,
  RefreshCw,
  ChevronRight,
  Info,
  KeyRound,
  MapPin,
  Search,
  ShoppingCart,
  Star,
  Home,
  Grid,
  ShoppingBag,
  SlidersHorizontal,
  Plus,
  Minus,
  Trash2,
  Package,
  Wrench,
  Flame,
  Award,
  Sparkles,
  Maximize2,
  X,
  Truck,
  ArrowLeft,
  CreditCard,
  Banknote,
  Calendar,
  Clock,
  ShieldAlert,
  FileCheck,
  FileText,
  HelpCircle,
  PhoneCall,
  LogOut,
  Edit3,
  Bell,
  CheckSquare,
  Square,
  Settings,
  Navigation,
  Bookmark,
  Phone,
  Briefcase,
  TrendingUp,
  Percent,
  AlertTriangle,
  Store,
  Layers,
  BadgePercent
} from 'lucide-react';

// Authentic Generated Images
import IMG_PURIFIER from './assets/images/califnco_purifier_hero_1792781266897.jpg';
import IMG_DISPENSER from './assets/images/califnco_dispenser_1792782204122.jpg';
import IMG_FILTERS from './assets/images/califnco_filter_cartridge_1792782204448.jpg';
import IMG_PUMP from './assets/images/califnco_booster_pump_1792782205142.jpg';

type ScreenId =
  | 'welcome'
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'home'
  | 'catalog'
  | 'details'
  | 'cart'
  | 'checkout'
  | 'order_confirmation'
  | 'order_history'
  | 'order_detail_view'
  | 'profile'
  | 'address_management'
  | 'dealer_home'
  | 'wholesale_catalog'
  | 'bulk_order_cart'
  | 'dealer_order_history'
  | 'service_booking'
  | 'booking_confirmation'
  | 'notifications'
  | 'delivery_location';

export interface Product {
  id: string;
  name: string;
  category: 'Water Purifiers' | 'Dispensers' | 'Pumps' | 'Filters' | 'Spare Parts';
  description: string;
  imageUrl: string;
  retailPrice: number;
  dealerPrice: number;
  stockQuantity: number;
  rating: number;
  reviewCount: number;
  specifications: Record<string, any>;
  moq: number; // Minimum Order Quantity for Wholesale
}

export type DealerApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface DealerProfileData {
  uid: string;
  dealerId: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  approvalStatus: DealerApprovalStatus;
  creditLimit: number;
  availableCredit: number;
  wholesaleTier: string;
  registeredWarehouse: string;
}

export interface DealerBulkOrderLineItem {
  productId: string;
  productName: string;
  category: string;
  wholesalePrice: number;
  quantity: number;
  lineTotal: number;
}

export interface DealerPurchaseOrder {
  id: string;
  dealerId: string;
  poNumber: string;
  date: string;
  itemCount: number;
  subtotal: number;
  deliveryCharges: number;
  totalWholesaleAmount: number;
  paymentStatus: 'paid_rtgs' | 'credit_net30' | 'pending';
  fulfilmentStatus: 'confirmed' | 'processing' | 'dispatched' | 'delivered';
  deliveryAddress: string;
  dealerGstin: string;
  lineItems: DealerBulkOrderLineItem[];
}

export const INITIAL_DEALER_PROFILE: DealerProfileData = {
  uid: 'dealer_vikram',
  dealerId: 'DLR-MH-8821',
  businessName: 'AquaPure Solutions Pvt Ltd',
  contactPerson: 'Vikram Malhotra',
  email: 'vikram@aquapuresolutions.in',
  phone: '+91 98201 55432',
  gstin: '27AABCV1234F1Z8',
  approvalStatus: 'approved',
  creditLimit: 500000,
  availableCredit: 324000,
  wholesaleTier: 'Tier 1 Platinum Partner (38% - 52% Margins)',
  registeredWarehouse: 'Gala 14, Apex Industrial Estate, Thane West, Mumbai - 400604',
};

export const SAMPLE_DEALER_ORDERS: DealerPurchaseOrder[] = [
  {
    id: 'po-1092',
    dealerId: 'dealer_vikram',
    poNumber: 'PO-DLR-2026-1092',
    date: 'Yesterday, 3:15 PM',
    itemCount: 45,
    subtotal: 184500,
    deliveryCharges: 0,
    totalWholesaleAmount: 184500,
    paymentStatus: 'credit_net30',
    fulfilmentStatus: 'dispatched',
    deliveryAddress: 'Gala 14, Apex Industrial Estate, Thane West, Mumbai - 400604',
    dealerGstin: '27AABCV1234F1Z8',
    lineItems: [
      {
        productId: 'wp-01',
        productName: 'Califnco Hydra Pure Elite RO+UV+Copper',
        category: 'Water Purifiers',
        wholesalePrice: 10800,
        quantity: 10,
        lineTotal: 108000,
      },
      {
        productId: 'fl-01',
        productName: 'Califnco 3-in-1 Filter Replacement Master Kit',
        category: 'Filters',
        wholesalePrice: 950,
        quantity: 25,
        lineTotal: 23750,
      },
      {
        productId: 'pm-01',
        productName: 'Califnco 150 GPD High-Torque Booster Pump',
        category: 'Pumps',
        wholesalePrice: 1850,
        quantity: 10,
        lineTotal: 18500,
      },
    ],
  },
  {
    id: 'po-1048',
    dealerId: 'dealer_vikram',
    poNumber: 'PO-DLR-2026-1048',
    date: 'Oct 12, 2026',
    itemCount: 30,
    subtotal: 112000,
    deliveryCharges: 0,
    totalWholesaleAmount: 112000,
    paymentStatus: 'paid_rtgs',
    fulfilmentStatus: 'delivered',
    deliveryAddress: 'Gala 14, Apex Industrial Estate, Thane West, Mumbai - 400604',
    dealerGstin: '27AABCV1234F1Z8',
    lineItems: [
      {
        productId: 'dp-01',
        productName: 'Califnco Aquara Touchless Digital Dispenser',
        category: 'Dispensers',
        wholesalePrice: 7999,
        quantity: 8,
        lineTotal: 63992,
      },
      {
        productId: 'fl-01',
        productName: 'Califnco 3-in-1 Filter Replacement Master Kit',
        category: 'Filters',
        wholesalePrice: 950,
        quantity: 22,
        lineTotal: 20900,
      },
    ],
  },
];

export const WHOLESALE_CATALOG_PRODUCTS: Product[] = [
  {
    id: 'wp-01',
    name: 'Califnco Hydra Pure Elite RO+UV+Copper',
    category: 'Water Purifiers',
    description: 'Commercial-grade residential RO purifier with 8-stage mineral balance technology.',
    imageUrl: IMG_PURIFIER,
    retailPrice: 17499,
    dealerPrice: 10800,
    stockQuantity: 480,
    rating: 4.9,
    reviewCount: 128,
    moq: 5,
    specifications: { capacity: '10 L/hr', stages: '8 Stages', warranty: '1 Year Membrane' },
  },
  {
    id: 'dp-01',
    name: 'Califnco Aquara Touchless Digital Dispenser',
    category: 'Dispensers',
    description: 'Hot, Cold, and Ambient sensor dispenser with energy-efficient compressor cooling.',
    imageUrl: IMG_DISPENSER,
    retailPrice: 12499,
    dealerPrice: 7999,
    stockQuantity: 215,
    rating: 4.8,
    reviewCount: 94,
    moq: 3,
    specifications: { cooling: '3 L/hr', heating: '5 L/hr', power: '550W' },
  },
  {
    id: 'fl-01',
    name: 'Califnco 3-in-1 Filter Replacement Master Kit',
    category: 'Filters',
    description: 'PP Spun Sediment, Pre-Carbon block & Post Carbon inline cartridge set.',
    imageUrl: IMG_FILTERS,
    retailPrice: 1999,
    dealerPrice: 950,
    stockQuantity: 1450,
    rating: 4.9,
    reviewCount: 312,
    moq: 20,
    specifications: { lifespan: '6000 Litres', micron: '5 Micron', compatibility: 'Universal 10 inch' },
  },
  {
    id: 'pm-01',
    name: 'Califnco 150 GPD High-Torque Booster Pump',
    category: 'Pumps',
    description: 'Heavy duty 100% copper-wound diaphragm booster pump for high-TDS raw water.',
    imageUrl: IMG_PUMP,
    retailPrice: 3499,
    dealerPrice: 1850,
    stockQuantity: 620,
    rating: 4.7,
    reviewCount: 88,
    moq: 10,
    specifications: { pressure: '125 PSI', flow: '1.8 LPM', voltage: '24V DC' },
  },
  {
    id: 'fl-02',
    name: 'Califnco Dow 80 GPD RO Membrane Cartridge',
    category: 'Filters',
    description: 'TFC polyamide membrane sheet with 97% stabilized salt rejection up to 2500 ppm.',
    imageUrl: IMG_FILTERS,
    retailPrice: 2499,
    dealerPrice: 1200,
    stockQuantity: 890,
    rating: 4.9,
    reviewCount: 204,
    moq: 15,
    specifications: { rejection: '97% TDS', flow: '80 GPD', maxTds: '2500 ppm' },
  },
  {
    id: 'sp-01',
    name: 'Califnco Heavy Duty Solenoid Valve & LP Switch',
    category: 'Spare Parts',
    description: 'Pure copper coil 24V DC automatic shut-off valve with fast-connect push fittings.',
    imageUrl: IMG_PUMP,
    retailPrice: 1299,
    dealerPrice: 620,
    stockQuantity: 980,
    rating: 4.6,
    reviewCount: 65,
    moq: 25,
    specifications: { voltage: '24V DC', port: '1/4 inch quick connect', life: '100,000 cycles' },
  },
];

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItemRecord {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
}

export interface FullOrder {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItemRecord[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'razorpay' | 'cod';
  paymentStatus: 'verified' | 'pending' | 'failed';
  orderStatus: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  };
  createdAt: string;
  estimatedDelivery?: string;
  timeline: {
    status: string;
    time: string;
    completed: boolean;
    current?: boolean;
  }[];
}

export interface AddressItem {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions?: string;
  label: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

export interface UserProfileData {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'customer' | 'dealer' | 'admin';
  notifications: {
    orderUpdates: boolean;
    filterReplacementReminders: boolean;
    technicianVisits: boolean;
  };
}

const INITIAL_PROFILE: UserProfileData = {
  uid: 'user_sarah',
  fullName: 'Sarah Jenkins',
  email: 'sarah.jenkins@example.com',
  phone: '+91 98765 43210',
  role: 'customer',
  notifications: {
    orderUpdates: true,
    filterReplacementReminders: true,
    technicianVisits: true,
  },
};

const INITIAL_ADDRESSES: AddressItem[] = [
  {
    id: 'addr-01',
    userId: 'user_sarah',
    recipientName: 'Sarah Jenkins',
    phone: '+91 98765 43210',
    streetAddress: 'Flat 402, Green Park Avenue, Link Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400050',
    deliveryInstructions: 'Ring bell twice, leave with security desk if unavailable',
    label: 'Home',
    isDefault: true,
  },
  {
    id: 'addr-02',
    userId: 'user_sarah',
    recipientName: 'Sarah Jenkins',
    phone: '+91 98765 43210',
    streetAddress: '7th Floor, Maker Chambers V, Nariman Point',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400021',
    deliveryInstructions: 'Corporate reception desk delivery between 9 AM to 6 PM',
    label: 'Work',
    isDefault: false,
  },
];

const SAMPLE_ORDERS: FullOrder[] = [
  {
    id: 'ord-82941',
    orderNumber: 'CALIF-82941',
    userId: 'user_sarah',
    items: [
      {
        productId: 'wp-01',
        productName: 'Califnco Hydra Pure Elite RO+UV+Copper',
        quantity: 1,
        unitPrice: 17499,
        imageUrl: IMG_PURIFIER,
      },
      {
        productId: 'fl-01',
        productName: 'Califnco 3-in-1 Complete Filter Replacement Kit',
        quantity: 2,
        unitPrice: 1999,
        imageUrl: IMG_FILTERS,
      },
    ],
    subtotal: 21497,
    deliveryFee: 0,
    totalAmount: 21497,
    paymentMethod: 'razorpay',
    paymentStatus: 'verified',
    orderStatus: 'processing',
    deliveryAddress: {
      name: 'Sarah Jenkins',
      phone: '+91 98765 43210',
      address: 'Flat 402, Green Park Avenue, Link Road',
      city: 'Mumbai',
      pincode: '400050',
    },
    createdAt: 'Today, 11:45 AM',
    estimatedDelivery: 'Tuesday, Oct 28 (Express Technician Delivery)',
    timeline: [
      { status: 'Order Placed & Verified', time: 'Today, 11:45 AM', completed: true },
      { status: 'Warehouse Allocation & Pre-Inspection', time: 'Today, 1:20 PM', completed: true, current: true },
      { status: 'Dispatched with Technician', time: 'Expected Oct 27', completed: false },
      { status: 'Delivered & Installed', time: 'Expected Oct 28', completed: false },
    ],
  },
  {
    id: 'ord-71024',
    orderNumber: 'CALIF-71024',
    userId: 'user_sarah',
    items: [
      {
        productId: 'dp-01',
        productName: 'Califnco Aquara Touchless Digital Dispenser',
        quantity: 1,
        unitPrice: 12499,
        imageUrl: IMG_DISPENSER,
      },
    ],
    subtotal: 12499,
    deliveryFee: 0,
    totalAmount: 12499,
    paymentMethod: 'razorpay',
    paymentStatus: 'verified',
    orderStatus: 'delivered',
    deliveryAddress: {
      name: 'Sarah Jenkins',
      phone: '+91 98765 43210',
      address: 'Flat 402, Green Park Avenue, Link Road',
      city: 'Mumbai',
      pincode: '400050',
    },
    createdAt: 'Oct 14, 2026',
    estimatedDelivery: 'Delivered on Oct 17, 2026',
    timeline: [
      { status: 'Order Placed', time: 'Oct 14, 2:30 PM', completed: true },
      { status: 'Tested & Packaged', time: 'Oct 15, 10:00 AM', completed: true },
      { status: 'Shipped via Califnco Logistics', time: 'Oct 16, 9:15 AM', completed: true },
      { status: 'Delivered & Installed by Specialist', time: 'Oct 17, 4:45 PM', completed: true },
    ],
  },
];

export interface MobileAppStudioProps {
  onOpenAdminConsole?: () => void;
}

const SERVICE_APPLICABLE_PRODUCTS: Array<{
  id: string;
  name: string;
  badge: string;
  onlyMaintenance?: boolean;
}> = [
  {
    id: 'wp-01',
    name: 'Califnco Hydra Pure Elite RO+UV+Copper',
    badge: 'Purchased · #CALIF-82941',
  },
  {
    id: 'dp-01',
    name: 'Califnco Aquara Touchless Digital Dispenser',
    badge: 'Purchased · #CALIF-71024',
  },
  {
    id: 'pm-01',
    name: 'Califnco 150 GPD High-Torque Booster Pump',
    badge: 'Catalog Hardware',
  },
  {
    id: 'fl-01',
    name: 'Califnco 3-in-1 Filter Replacement Master Kit',
    badge: 'Consumable Kit',
  },
  {
    id: '',
    name: 'General Water System Assessment (No Specific Unit)',
    badge: 'Multi-Unit / Periodic Check',
    onlyMaintenance: true,
  },
];

function getTomorrowIsoDate(): string {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().slice(0, 10);
}

const OSM_NEIGHBORHOOD_PRESETS: Array<{
  label: string;
  city: string;
  state: string;
  postalCode: string;
  point: LatLngPoint;
}> = [
  {
    label: 'Bandra West · Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400050',
    point: { lat: 19.0596, lng: 72.8295 },
  },
  {
    label: 'Indiranagar · Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    point: { lat: 12.9784, lng: 77.6408 },
  },
  {
    label: 'Connaught Place · New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    postalCode: '110001',
    point: { lat: 28.6315, lng: 77.2167 },
  },
];

function formatRelativeNotificationTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  const diffSec = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(parsed).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ProductStudioImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

const ProductStudioImage: React.FC<ProductStudioImageProps> = ({
  src,
  alt,
  className = 'w-16 h-16 rounded-xl',
  imgClassName = 'object-cover',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 ${className}`}
    >
      {failed || !src ? (
        <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
          <Droplets className="w-5 h-5 text-teal-600/70" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full h-full ${imgClassName} transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-90'
          }`}
        />
      )}
    </div>
  );
};

export default function MobileAppStudio({ onOpenAdminConsole }: MobileAppStudioProps = {}) {
  const [deviceModel, setDeviceModel] = useState<'pixel' | 'galaxy' | 'compact'>('pixel');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'instructions'>('simulator');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('notifications_screen.dart');
  const [segmentCodeTab, setSegmentCodeTab] = useState<
    'segment11' | 'segment10' | 'segment9' | 'segment8'
  >('segment11');

  // Firebase Auth state for real Cloud Firestore writes & live status streaming
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);

  // Segment 9: Bulk Order Cart & Dealer Order History states
  const [isSubmittingPO, setIsSubmittingPO] = useState<boolean>(false);
  const [selectedDealerOrderForDetails, setSelectedDealerOrderForDetails] = useState<DealerPurchaseOrder | null>(null);

  // Order state
  const [orders, setOrders] = useState<FullOrder[]>(SAMPLE_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<FullOrder>(SAMPLE_ORDERS[0]);
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
  const [activeBottomNav, setActiveBottomNav] = useState<'home' | 'catalog' | 'cart' | 'orders' | 'profile'>('home');
  const [authRole, setAuthRole] = useState<'customer' | 'dealer'>('customer');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [paymentChoice, setPaymentChoice] = useState<'razorpay' | 'cod'>('cod');

  // Controlled Auth Form State & Validation
  const [loginEmail, setLoginEmail] = useState<string>('sarah.jenkins@example.com');
  const [loginPassword, setLoginPassword] = useState<string>('PureWater@2026');
  const [authFormError, setAuthFormError] = useState<string | null>(null);
  const [regName, setRegName] = useState<string>('Sarah Jenkins');
  const [regBusinessName, setRegBusinessName] = useState<string>('Jenkins Aqua Distributors');
  const [regEmail, setRegEmail] = useState<string>('sarah.jenkins@example.com');
  const [regPhone, setRegPhone] = useState<string>('+91 98765 43210');
  const [regGstin, setRegGstin] = useState<string>('27AABCU9603R1ZM');
  const [regPassword, setRegPassword] = useState<string>('PureWater@2026');
  const [resetEmail, setResetEmail] = useState<string>('sarah.jenkins@example.com');

  // Dynamic Retail Catalog, Product Details, Shopping Cart & Checkout State
  const [retailSearch, setRetailSearch] = useState<string>('');
  const [retailSort, setRetailSort] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating'>('featured');
  const [selectedRetailProduct, setSelectedRetailProduct] = useState<Product>(
    WHOLESALE_CATALOG_PRODUCTS[0]
  );
  const [detailQty, setDetailQty] = useState<number>(1);
  const [isProductZoomOpen, setIsProductZoomOpen] = useState<boolean>(false);
  const [isPlacingRetailOrder, setIsPlacingRetailOrder] = useState<boolean>(false);
  const [retailCart, setRetailCart] = useState<CartItem[]>([
    { product: WHOLESALE_CATALOG_PRODUCTS[0], quantity: 1 },
    { product: WHOLESALE_CATALOG_PRODUCTS[2], quantity: 2 },
  ]);

  const cartCount = useMemo(
    () => retailCart.reduce((sum, item) => sum + item.quantity, 0),
    [retailCart]
  );

  const retailSubtotal = useMemo(
    () => retailCart.reduce((sum, item) => sum + item.product.retailPrice * item.quantity, 0),
    [retailCart]
  );

  const retailDeliveryFee = useMemo(
    () => (retailCart.length === 0 || retailSubtotal >= 2500 ? 0 : 199),
    [retailCart.length, retailSubtotal]
  );

  const retailIncludedGst = useMemo(
    () => Math.round((retailSubtotal * 18) / 118),
    [retailSubtotal]
  );

  const retailGrandTotal = retailSubtotal + retailDeliveryFee;

  const filteredRetailProducts = useMemo(() => {
    const q = retailSearch.trim().toLowerCase();
    const filtered = WHOLESALE_CATALOG_PRODUCTS.filter((p) => {
      const catMatch = catalogCategory === 'All' || p.category === catalogCategory;
      const queryMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return catMatch && queryMatch;
    });
    const sorted = [...filtered];
    if (retailSort === 'price_asc') {
      sorted.sort((a, b) => a.retailPrice - b.retailPrice);
    } else if (retailSort === 'price_desc') {
      sorted.sort((a, b) => b.retailPrice - a.retailPrice);
    } else if (retailSort === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    }
    return sorted;
  }, [catalogCategory, retailSearch, retailSort]);

  // Profile & Address state for Segment 7
  const [profile, setProfile] = useState<UserProfileData>(INITIAL_PROFILE);
  const [addresses, setAddresses] = useState<AddressItem[]>(INITIAL_ADDRESSES);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(INITIAL_PROFILE.fullName);
  const [editPhone, setEditPhone] = useState<string>(INITIAL_PROFILE.phone);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<AddressItem, 'id' | 'userId'>>({
    recipientName: 'Sarah Jenkins',
    phone: '+91 98765 43210',
    streetAddress: 'Flat 402, Green Park Avenue, Link Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400050',
    deliveryInstructions: 'Ring bell twice, leave with security if unavailable',
    label: 'Home',
    isDefault: false,
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dealer State for Segment 8 (Screens 15 & 16)
  const [dealerProfile, setDealerProfile] = useState<DealerProfileData>(INITIAL_DEALER_PROFILE);
  const [dealerOrders, setDealerOrders] = useState<DealerPurchaseOrder[]>(SAMPLE_DEALER_ORDERS);
  const [wholesaleCart, setWholesaleCart] = useState<Record<string, number>>({
    'wp-01': 5,
    'fl-01': 20,
  });
  const [wholesaleSearch, setWholesaleSearch] = useState<string>('');
  const [wholesaleCategory, setWholesaleCategory] = useState<string>('All');
  const [wholesaleItemQuantities, setWholesaleItemQuantities] = useState<Record<string, number>>({
    'wp-01': 5,
    'dp-01': 3,
    'fl-01': 20,
    'pm-01': 10,
    'fl-02': 15,
    'sp-01': 25,
  });

  // =========================================================================
  // Segment 10: Screen 23 (Service Booking) & Screen 24 (Booking Confirmation)
  // =========================================================================
  const [serviceCategory, setServiceCategory] = useState<ServiceRequestCategory>('Installation');
  const [serviceProductId, setServiceProductId] = useState<string>('wp-01');
  const [serviceProductModel, setServiceProductModel] = useState<string>(
    'Califnco Hydra Pure Elite RO+UV+Copper'
  );
  const [serviceLinkedOrderNumber, setServiceLinkedOrderNumber] = useState<string>('CALIF-82941');
  const [serviceDescription, setServiceDescription] = useState<string>(
    'Wall-mount kitchen RO installation near municipal tap inlet; require pre-filter housing setup and initial TDS calibration.'
  );
  const [selectedServiceAddressId, setSelectedServiceAddressId] = useState<string>('addr-01');
  const [serviceStreetAddress, setServiceStreetAddress] = useState<string>(
    INITIAL_ADDRESSES[0].streetAddress
  );
  const [serviceCityState, setServiceCityState] = useState<string>(
    `${INITIAL_ADDRESSES[0].city}, ${INITIAL_ADDRESSES[0].state}`
  );
  const [servicePostalCode, setServicePostalCode] = useState<string>(
    INITIAL_ADDRESSES[0].postalCode
  );
  const [servicePreferredDate, setServicePreferredDate] = useState<string>(() =>
    getTomorrowIsoDate()
  );
  const [simulatedScheduleEnabled, setSimulatedScheduleEnabled] = useState<boolean>(false);
  const [scheduleLookup, setScheduleLookup] = useState<ScheduleLookupResult>({
    scheduleId: '',
    isConfigured: false,
    availableSlots: [],
    source: 'unconfigured',
  });
  const [isCheckingSchedule, setIsCheckingSchedule] = useState<boolean>(false);
  const [serviceSelectedSlot, setServiceSelectedSlot] = useState<string>('');
  const [serviceContactName, setServiceContactName] = useState<string>(INITIAL_PROFILE.fullName);
  const [serviceContactPhone, setServiceContactPhone] = useState<string>(INITIAL_PROFILE.phone);
  const [serviceFormErrors, setServiceFormErrors] = useState<Record<string, string>>({});
  const [serviceSubmitError, setServiceSubmitError] = useState<string | null>(null);
  const [isSubmittingService, setIsSubmittingService] = useState<boolean>(false);

  const [localSubmittedBookings, setLocalSubmittedBookings] = useState<MobileServiceBookingRecord[]>(
    []
  );
  const [firestoreCustomerBookings, setFirestoreCustomerBookings] = useState<
    MobileServiceBookingRecord[]
  >([]);
  const [selectedBookingRecord, setSelectedBookingRecord] =
    useState<MobileServiceBookingRecord | null>(null);
  const [isMyRequestsDrawerOpen, setIsMyRequestsDrawerOpen] = useState<boolean>(false);

  // =========================================================================
  // Segment 11: Screen 25 (Notifications + FCM) & Screen 26 (Delivery Location)
  // =========================================================================
  const [demoNotifications, setDemoNotifications] = useState<MobileNotificationItem[]>(
    DEMO_PREVIEW_NOTIFICATIONS
  );
  const [firestoreNotifications, setFirestoreNotifications] = useState<MobileNotificationItem[]>(
    []
  );
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);
  const [notificationsFilter, setNotificationsFilter] = useState<'all' | 'unread'>('all');
  const [simulateEmptyInbox, setSimulateEmptyInbox] = useState<boolean>(false);
  const [fcmStatus, setFcmStatus] = useState<WebFcmStatusSnapshot | null>(null);
  const [isRequestingFcm, setIsRequestingFcm] = useState<boolean>(false);
  const [foregroundBannerAlert, setForegroundBannerAlert] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [isEmittingOrderEvent, setIsEmittingOrderEvent] = useState<boolean>(false);

  // Screen 26: OpenStreetMap & Manual Delivery Location State
  const [mapCenter, setMapCenter] = useState<LatLngPoint>({ lat: 19.0596, lng: 72.8295 });
  const [selectedMapPin, setSelectedMapPin] = useState<LatLngPoint | null>({
    lat: 19.0596,
    lng: 72.8295,
  });
  const [locationCaptureSource, setLocationCaptureSource] =
    useState<LocationCaptureSource>('map_pin');
  const [manualAddressFallbackMode, setManualAddressFallbackMode] = useState<boolean>(false);
  const [osmTileLoadFailed, setOsmTileLoadFailed] = useState<boolean>(false);
  const [isLocatingBrowserGps, setIsLocatingBrowserGps] = useState<boolean>(false);

  const [locLabel, setLocLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [locRecipientName, setLocRecipientName] = useState<string>(INITIAL_PROFILE.fullName);
  const [locPhone, setLocPhone] = useState<string>(INITIAL_PROFILE.phone);
  const [locStreetAddress, setLocStreetAddress] = useState<string>(
    'Flat 402, Green Park Avenue, Link Road'
  );
  const [locLandmark, setLocLandmark] = useState<string>('Near Linking Road Promenade');
  const [locCity, setLocCity] = useState<string>('Mumbai');
  const [locState, setLocState] = useState<string>('Maharashtra');
  const [locPostalCode, setLocPostalCode] = useState<string>('400050');
  const [locInstructions, setLocInstructions] = useState<string>(
    'Ring bell twice or check in at society security desk'
  );
  const [locIsDefault, setLocIsDefault] = useState<boolean>(true);
  const [locFormErrors, setLocFormErrors] = useState<Record<string, string>>({});
  const [locSubmitError, setLocSubmitError] = useState<string | null>(null);
  const [isSavingLocation, setIsSavingLocation] = useState<boolean>(false);
  const [firestoreSavedLocations, setFirestoreSavedLocations] = useState<
    SavedDeliveryLocationRecord[]
  >([]);
  const [returnScreenAfterLocationSave, setReturnScreenAfterLocationSave] =
    useState<ScreenId>('address_management');

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (u?.displayName) {
        setServiceContactName(u.displayName);
        setLocRecipientName(u.displayName);
      }
    });
    return () => unsub();
  }, []);

  // Inspect real Web Notification / FCM status whenever auth state changes
  useEffect(() => {
    let active = true;
    inspectWebFcmStatus(firebaseUser).then((snap) => {
      if (active) setFcmStatus(snap);
    });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  // Attach foreground FCM listener (`onMessage`) when supported by browser
  useEffect(() => {
    let unsubFcm: (() => void) | null = null;
    attachForegroundFcmListener((payload) => {
      const title = payload.notification?.title ?? 'Califnco Order Update';
      const body = payload.notification?.body ?? 'New order notification received in foreground.';
      setForegroundBannerAlert({ title, body });
    }).then((fn) => {
      unsubFcm = fn;
    });
    return () => {
      unsubFcm?.();
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseUser || !firebaseUser.emailVerified) {
      setFirestoreCustomerBookings([]);
      setFirestoreNotifications([]);
      setFirestoreSavedLocations([]);
      return;
    }
    const unsubBookings = subscribeCustomerServiceRequests(firebaseUser.uid, {
      onRequests: (records) => {
        setFirestoreCustomerBookings(records);
      },
    });

    setIsLoadingNotifications(true);
    const unsubNotifs = subscribeUserNotifications(firebaseUser.uid, {
      onNotifications: (items) => {
        setFirestoreNotifications(items);
        setIsLoadingNotifications(false);
      },
      onError: () => {
        setIsLoadingNotifications(false);
      },
    });

    const unsubAddresses = subscribeUserDeliveryAddresses(firebaseUser.uid, {
      onAddresses: (records) => {
        setFirestoreSavedLocations(records);
        if (records.length > 0) {
          const mapped: AddressItem[] = records.map((r) => ({
            id: r.addressId,
            userId: r.userId,
            recipientName: r.recipientName,
            phone: r.phone,
            streetAddress: r.landmark
              ? `${r.streetAddress} (${r.landmark})`
              : r.streetAddress,
            city: r.city,
            state: r.state,
            postalCode: r.postalCode,
            deliveryInstructions: r.deliveryInstructions,
            label: r.label,
            isDefault: r.isDefault,
          }));
          setAddresses(mapped);
        }
      },
    });

    const unsubDealers = onSnapshot(
      doc(db, 'dealers', firebaseUser.uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const statusRaw = String(d.approvalStatus ?? 'pending');
        const approvalStatus: DealerApprovalStatus =
          statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';
        setDealerProfile((prev) => ({
          ...prev,
          uid: firebaseUser.uid,
          dealerId: String(d.dealerCode ?? d.dealerId ?? prev.dealerId),
          businessName: String(d.businessName ?? prev.businessName),
          contactPerson: String(d.contactPerson ?? prev.contactPerson),
          gstin: String(d.gstin ?? prev.gstin),
          approvalStatus,
          creditLimit: Number(d.creditLimit ?? 0),
          availableCredit: Number(d.availableCredit ?? 0),
          wholesaleTier: String(d.wholesaleTier ?? prev.wholesaleTier),
        }));
      },
      () => {
        // Non-dealer accounts simply keep local simulator dealer profile
      }
    );

    return () => {
      unsubBookings();
      unsubNotifs();
      unsubAddresses();
      unsubDealers();
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!isProductZoomOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProductZoomOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isProductZoomOpen]);

  // Query configured scheduling system (/service_schedules/{date}_{pin}) whenever date or PIN changes
  useEffect(() => {
    let cancelled = false;
    setIsCheckingSchedule(true);
    fetchConfiguredScheduleSlots(
      servicePreferredDate,
      servicePostalCode,
      simulatedScheduleEnabled
    )
      .then((res) => {
        if (cancelled) return;
        setScheduleLookup(res);
        setIsCheckingSchedule(false);
        if (!res.isConfigured || !res.availableSlots.includes(serviceSelectedSlot)) {
          setServiceSelectedSlot('');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setScheduleLookup({
          scheduleId: '',
          isConfigured: false,
          availableSlots: [],
          source: 'unconfigured',
        });
        setServiceSelectedSlot('');
        setIsCheckingSchedule(false);
      });

    return () => {
      cancelled = true;
    };
  }, [servicePreferredDate, servicePostalCode, simulatedScheduleEnabled, firebaseUser]);

  const allMyServiceRequests = useMemo(() => {
    const map = new Map<string, MobileServiceBookingRecord>();
    for (const r of firestoreCustomerBookings) {
      map.set(r.id, r);
    }
    for (const r of localSubmittedBookings) {
      if (!map.has(r.id)) {
        map.set(r.id, r);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.submissionDateIso || '').localeCompare(a.submissionDateIso || '')
    );
  }, [firestoreCustomerBookings, localSubmittedBookings]);

  const activeBookingForConfirmation = useMemo<MobileServiceBookingRecord>(() => {
    if (selectedBookingRecord) {
      const liveMatch = firestoreCustomerBookings.find(
        (r) => r.id === selectedBookingRecord.id
      );
      return liveMatch ?? selectedBookingRecord;
    }
    if (allMyServiceRequests.length > 0) {
      return allMyServiceRequests[0];
    }
    return {
      id: 'srv-preview-4810',
      ticketNumber: 'SRV-2026-4810',
      orderId: 'DIRECT-SERVICE',
      orderNumber: 'CALIF-82941',
      customerUid: firebaseUser?.uid ?? 'user_sarah',
      customerCode: 'CUST-SARAH1',
      customerDisplayName: serviceContactName || 'Sarah Jenkins',
      requestCategory: serviceCategory,
      serviceType: 'RO Installation',
      status: 'open',
      regionCity: serviceCityState || 'Mumbai, Maharashtra',
      submissionDateIso: new Date().toISOString(),
      preferredDateIso: servicePreferredDate,
      preferredTimeSlot: '',
      productId: 'wp-01',
      productModel: 'Califnco Hydra Pure Elite RO+UV+Copper',
      requestDetails: serviceDescription,
      resolutionNotes: '',
      serviceAddress: `${serviceStreetAddress}, ${serviceCityState} - ${servicePostalCode}`,
      contactName: serviceContactName || 'Sarah Jenkins',
      contactPhone: serviceContactPhone || '+91 98765 43210',
      persistedToFirestore: false,
    };
  }, [
    selectedBookingRecord,
    firestoreCustomerBookings,
    allMyServiceRequests,
    firebaseUser,
    serviceContactName,
    serviceCategory,
    serviceCityState,
    servicePreferredDate,
    serviceDescription,
    serviceStreetAddress,
    servicePostalCode,
    serviceContactPhone,
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleMobileGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setAuthFormError(null);
      showToast('Signed in with Google. Live Cloud Firestore persistence active.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('popup-closed-by-user')) {
        showToast(msg);
      }
    }
  };

  const addToRetailCart = (product: Product, qtyToAdd: number = 1) => {
    if (product.stockQuantity <= 0) {
      showToast('This item is currently out of stock.');
      return;
    }
    setRetailCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        const nextQty = Math.min(product.stockQuantity, updated[idx].quantity + qtyToAdd);
        updated[idx] = { ...updated[idx], quantity: nextQty };
        return updated;
      }
      return [...prev, { product, quantity: Math.min(product.stockQuantity, Math.max(1, qtyToAdd)) }];
    });
    showToast(`Added ${product.name} to cart.`);
  };

  const updateRetailCartQty = (productId: string, delta: number) => {
    setRetailCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = item.quantity + delta;
          if (next <= 0) return null;
          return { ...item, quantity: Math.min(item.product.stockQuantity, next) };
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const removeFromRetailCart = (productId: string) => {
    setRetailCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Removed item from cart.');
  };

  const handlePlaceRetailOrder = async () => {
    if (isPlacingRetailOrder || retailCart.length === 0) return;
    if (!defaultDeliveryAddress.streetAddress.trim() || !defaultDeliveryAddress.postalCode.trim()) {
      showToast('Please select or enter a valid delivery address before placing your order.');
      return;
    }

    setIsPlacingRetailOrder(true);
    try {
      const numericSuffix = Math.floor(10000 + Math.random() * 89999);
      const orderNumber = `CALIF-${numericSuffix}`;
      const orderId = `ord-${numericSuffix}`;
      const nowIso = new Date().toISOString();
      const totalUnits = retailCart.reduce((s, c) => s + c.quantity, 0);

      let persistedLive = false;
      // Persist COD orders to live Cloud Firestore when signed in with a verified email.
      // Razorpay client-side test checkouts are intentionally NOT marked 'paid' in Firestore
      // because no server-side Razorpay Order + HMAC-SHA256 webhook secret is configured.
      if (isFirebaseConfigured && firebaseUser?.emailVerified && paymentChoice === 'cod') {
        const batch = writeBatch(db);
        const ts = serverTimestamp();
        const safePostal = defaultDeliveryAddress.postalCode
          .replace(/[^0-9A-Za-z\- ]/g, '')
          .trim()
          .slice(0, 16) || '400050';
        const partyId = `CUST-${firebaseUser.uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'USER01'}`;

        batch.set(doc(db, 'orders', orderId), {
          orderNumber,
          channel: 'customer',
          customerUid: firebaseUser.uid,
          partyId,
          partyDisplayName: (defaultDeliveryAddress.recipientName || profile.fullName).slice(0, 120),
          regionCity: `${defaultDeliveryAddress.city}, ${defaultDeliveryAddress.state}`.slice(0, 80),
          orderDateIso: nowIso,
          itemCount: totalUnits,
          subtotalAmount: retailSubtotal,
          deliveryAmount: retailDeliveryFee,
          totalAmount: retailGrandTotal,
          paymentStatus: 'cod_pending',
          fulfilmentStatus: 'pending',
          createdByUid: firebaseUser.uid,
          createdAt: ts,
          updatedAt: ts,
        });

        retailCart.forEach((entry, idx) => {
          const itemId = `item-${idx + 1}`;
          batch.set(doc(db, 'orders', orderId, 'items', itemId), {
            orderId,
            customerUid: firebaseUser.uid,
            sku: entry.product.id.toUpperCase(),
            productName: entry.product.name.slice(0, 160),
            category: entry.product.category,
            quantity: entry.quantity,
            unitPrice: entry.product.retailPrice,
            lineTotal: entry.product.retailPrice * entry.quantity,
            createdAt: ts,
          });
        });

        batch.set(doc(db, 'orders', orderId, 'private_details', 'shipping'), {
          orderId,
          recipientName: defaultDeliveryAddress.recipientName.slice(0, 120),
          email: (firebaseUser.email || profile.email).slice(0, 160),
          phone: defaultDeliveryAddress.phone.slice(0, 24),
          shippingAddress: `${defaultDeliveryAddress.streetAddress}, ${defaultDeliveryAddress.city}, ${defaultDeliveryAddress.state}`.slice(0, 320),
          postalCode: safePostal,
          gstin: '',
          dispatchNotes: (defaultDeliveryAddress.deliveryInstructions || '').slice(0, 400),
          createdAt: ts,
          updatedAt: ts,
        });

        await batch.commit();
        persistedLive = true;
      }

      const newOrder: FullOrder = {
        id: orderId,
        orderNumber,
        userId: firebaseUser?.uid ?? profile.uid,
        items: retailCart.map((c) => ({
          productId: c.product.id,
          productName: c.product.name,
          quantity: c.quantity,
          unitPrice: c.product.retailPrice,
          imageUrl: c.product.imageUrl,
        })),
        subtotal: retailSubtotal,
        deliveryFee: retailDeliveryFee,
        totalAmount: retailGrandTotal,
        paymentMethod: paymentChoice,
        paymentStatus: 'pending',
        orderStatus: 'confirmed',
        deliveryAddress: {
          name: defaultDeliveryAddress.recipientName,
          phone: defaultDeliveryAddress.phone,
          address: defaultDeliveryAddress.streetAddress,
          city: defaultDeliveryAddress.city,
          pincode: defaultDeliveryAddress.postalCode,
        },
        createdAt: 'Just now',
        estimatedDelivery: 'Technician dispatch scheduled within 48–72 hrs after verification',
        timeline: [
          {
            status:
              paymentChoice === 'cod'
                ? 'Order Submitted (COD — Pay on Delivery)'
                : 'Test Checkout Recorded (Gateway Signature Pending)',
            time: 'Just now',
            completed: true,
            current: true,
          },
          { status: 'Warehouse Allocation & Pre-Inspection', time: 'Pending', completed: false },
          { status: 'Dispatched with Technician', time: 'Pending', completed: false },
          { status: 'Delivered & Installed', time: 'Pending', completed: false },
        ],
      };

      setOrders((prev) => [newOrder, ...prev]);
      setSelectedOrder(newOrder);
      setRetailCart([]);
      setCurrentScreen('order_confirmation');
      showToast(
        persistedLive
          ? `Order #${orderNumber} saved to Cloud Firestore (COD Pending).`
          : paymentChoice === 'cod'
          ? `Order #${orderNumber} recorded (COD — Pay on Delivery).`
          : `Test order #${orderNumber} recorded (Gateway payment unverified without backend webhook).`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg);
    } finally {
      setIsPlacingRetailOrder(false);
    }
  };

  const handleAuthLoginSubmit = () => {
    const emailTrimmed = loginEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setAuthFormError('Enter a valid email address to sign in.');
      return;
    }
    if (loginPassword.trim().length < 8) {
      setAuthFormError('Password must be at least 8 characters.');
      return;
    }
    setAuthFormError(null);
    if (authRole === 'dealer') {
      setCurrentScreen('dealer_home');
      showToast(`Signed in to Dealer Hub (${dealerProfile.approvalStatus.toUpperCase()}).`);
    } else {
      setProfile((prev) => ({ ...prev, email: emailTrimmed }));
      setCurrentScreen('home');
      showToast('Signed in to Califnco Customer Store.');
    }
  };

  const handleAuthRegisterSubmit = async () => {
    const nameTrim = regName.trim();
    const emailTrim = regEmail.trim();
    const phoneDigits = regPhone.replace(/\D/g, '');
    const gstinClean = regGstin.trim().toUpperCase();

    if (nameTrim.length < 2) {
      setAuthFormError('Enter your full name (minimum 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setAuthFormError('Enter a valid email address.');
      return;
    }
    if (phoneDigits.length < 10) {
      setAuthFormError('Enter a valid 10-digit contact phone number.');
      return;
    }
    if (authRole === 'dealer') {
      if (regBusinessName.trim().length < 2) {
        setAuthFormError('Enter your registered business or firm name.');
        return;
      }
      if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(gstinClean)) {
        setAuthFormError('Enter a valid 15-character alphanumeric GSTIN (e.g. 27AABCU9603R1ZM).');
        return;
      }
    }
    if (regPassword.length < 8) {
      setAuthFormError('Choose a password with at least 8 characters.');
      return;
    }

    setAuthFormError(null);

    if (authRole === 'dealer') {
      const codeSuffix = Math.floor(1000 + Math.random() * 8999);
      const dealerCode = `DLR-APP-${codeSuffix}`;
      setDealerProfile({
        uid: firebaseUser?.uid ?? `dealer_${codeSuffix}`,
        dealerId: dealerCode,
        businessName: regBusinessName.trim(),
        contactPerson: nameTrim,
        email: emailTrim,
        phone: regPhone.trim(),
        gstin: gstinClean,
        approvalStatus: 'pending',
        creditLimit: 0,
        availableCredit: 0,
        wholesaleTier: 'Application Pending Verification',
        registeredWarehouse: `${defaultDeliveryAddress.streetAddress}, ${defaultDeliveryAddress.city}`,
      });
      setCurrentScreen('dealer_home');
      showToast('Dealer application submitted. Status set to PENDING administrator review.');
      return;
    }

    setProfile((prev) => ({
      ...prev,
      fullName: nameTrim,
      email: emailTrim,
      phone: regPhone.trim(),
    }));
    setLoginEmail(emailTrim);
    setCurrentScreen('home');
    showToast('Customer account created.');
  };

  const handleSelectSavedServiceAddress = (addrId: string) => {
    setSelectedServiceAddressId(addrId);
    if (addrId === 'custom') return;
    const found = addresses.find((a) => a.id === addrId);
    if (found) {
      setServiceStreetAddress(found.streetAddress);
      setServiceCityState(`${found.city}, ${found.state}`);
      setServicePostalCode(found.postalCode);
      setServiceContactName(found.recipientName);
      setServiceContactPhone(found.phone);
      setServiceFormErrors((prev) => {
        const next = { ...prev };
        delete next.streetAddress;
        delete next.cityState;
        delete next.postalCode;
        delete next.contactPhone;
        return next;
      });
    }
  };

  const handleServiceBookingSubmit = async () => {
    if (isSubmittingService) return;
    setServiceSubmitError(null);

    const payload = {
      category: serviceCategory,
      productId: serviceProductId,
      productModel: serviceProductModel,
      issueDescription: serviceDescription,
      streetAddress: serviceStreetAddress,
      cityState: serviceCityState,
      postalCode: servicePostalCode,
      preferredDateIso: servicePreferredDate,
      preferredTimeSlot: scheduleLookup.isConfigured ? serviceSelectedSlot : '',
      isScheduleConfigured: scheduleLookup.isConfigured,
      configuredSlots: scheduleLookup.availableSlots,
      contactName: serviceContactName,
      contactPhone: serviceContactPhone,
      linkedOrderNumber: serviceLinkedOrderNumber,
    };

    const validationErrors = validateMobileServiceBookingForm(payload);
    setServiceFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setServiceSubmitError('Please fix the highlighted fields before submitting your request.');
      return;
    }

    setIsSubmittingService(true);
    try {
      const created = await submitMobileServiceBooking(payload);
      setLocalSubmittedBookings((prev) => [created, ...prev]);
      setSelectedBookingRecord(created);
      setCurrentScreen('booking_confirmation');
      showToast(
        created.persistedToFirestore
          ? `Saved ${created.ticketNumber} to Cloud Firestore (Open — Pending Confirmation).`
          : `Submitted ${created.ticketNumber} in simulator preview (Sign in with Google for Cloud Firestore write).`
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setServiceSubmitError(raw);
    } finally {
      setIsSubmittingService(false);
    }
  };

  const activeNotifications = useMemo<MobileNotificationItem[]>(() => {
    if (simulateEmptyInbox) return [];
    if (firebaseUser && firebaseUser.emailVerified) {
      return firestoreNotifications;
    }
    return demoNotifications;
  }, [simulateEmptyInbox, firebaseUser, firestoreNotifications, demoNotifications]);

  const unreadNotificationCount = useMemo(
    () => activeNotifications.filter((n) => !n.isRead).length,
    [activeNotifications]
  );

  const defaultDeliveryAddress = useMemo<AddressItem>(
    () => addresses.find((a) => a.isDefault) ?? addresses[0] ?? INITIAL_ADDRESSES[0],
    [addresses]
  );

  const handleMarkNotificationRead = async (item: MobileNotificationItem) => {
    if (item.isRead) return;
    if (item.persistedToFirestore) {
      try {
        await markUserNotificationAsRead(item.id);
        showToast('Marked notification as read in Cloud Firestore.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg);
      }
    } else {
      setDemoNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, isRead: true, readAtIso: new Date().toISOString() } : n
        )
      );
      showToast('Marked demo notification as read.');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unread = activeNotifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await markAllUserNotificationsAsRead(
          unread.filter((n) => n.persistedToFirestore).map((n) => n.id)
        );
        showToast('Marked all notifications as read.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg);
      }
    } else {
      const nowIso = new Date().toISOString();
      setDemoNotifications((prev) =>
        prev.map((n) => (n.isRead ? n : { ...n, isRead: true, readAtIso: nowIso }))
      );
      showToast('Marked all demo notifications as read.');
    }
  };

  const handleRequestPushPermissions = async () => {
    if (isRequestingFcm) return;
    setIsRequestingFcm(true);
    try {
      const snap = await requestWebNotificationPermissionAndSync(firebaseUser);
      setFcmStatus(snap);
      showToast(snap.summaryTitle);
    } finally {
      setIsRequestingFcm(false);
    }
  };

  const handleEmitTrustedOrderEvent = async (
    eventType: 'order_confirmed' | 'order_dispatched' | 'order_delivered'
  ) => {
    if (isEmittingOrderEvent) return;
    setIsEmittingOrderEvent(true);
    setSimulateEmptyInbox(false);
    try {
      const recipientUid = firebaseUser?.uid ?? 'user_sarah';
      const created = await emitTrustedAdminOrderNotificationForTesting({
        recipientUid,
        orderNumber: 'CALIF-82941',
        eventType,
      });
      if (!created.persistedToFirestore) {
        setDemoNotifications((prev) => [created, ...prev]);
      }
      setForegroundBannerAlert({
        title: created.title,
        body: created.persistedToFirestore
          ? 'Foreground inbox event synced from Cloud Firestore (no push fabricated).'
          : 'Simulated foreground alert banner (connect Google Auth for live Firestore write).',
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      showToast(
        raw.includes('permission') || raw.includes('insufficient')
          ? 'Blocked by Firestore rules: only trusted backend / verified Admin can create notifications.'
          : raw
      );
    } finally {
      setIsEmittingOrderEvent(false);
    }
  };

  const handleBrowserLocateMe = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      showToast('Geolocation API unavailable; use map tap or manual address entry.');
      return;
    }
    setIsLocatingBrowserGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setManualAddressFallbackMode(false);
        setSelectedMapPin(pt);
        setMapCenter(pt);
        setLocationCaptureSource('gps_pin');
        setIsLocatingBrowserGps(false);
        showToast(
          'GPS pin placed. Confirm your street address & PIN below (coordinates do not verify postal address).'
        );
      },
      () => {
        setIsLocatingBrowserGps(false);
        showToast(
          'Location permission unavailable in preview frame. Tap the map or enter address manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const handleSaveDeliveryLocation = async () => {
    if (isSavingLocation) return;
    setLocSubmitError(null);

    const includeCoordinates =
      !manualAddressFallbackMode && !osmTileLoadFailed && selectedMapPin !== null;

    const payload = {
      label: locLabel,
      recipientName: locRecipientName,
      phone: locPhone,
      streetAddress: locStreetAddress,
      landmark: locLandmark,
      city: locCity,
      state: locState,
      postalCode: locPostalCode,
      deliveryInstructions: locInstructions,
      isDefault: locIsDefault,
      hasCoordinates: includeCoordinates,
      latitude: includeCoordinates && selectedMapPin ? selectedMapPin.lat : 0,
      longitude: includeCoordinates && selectedMapPin ? selectedMapPin.lng : 0,
      locationSource: includeCoordinates ? locationCaptureSource : ('manual_only' as const),
    };

    const validationErrors = validateDeliveryLocationForm(payload);
    setLocFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setLocSubmitError('Please complete all required postal address fields before saving.');
      return;
    }

    setIsSavingLocation(true);
    try {
      const saved = await saveUserDeliveryAddress(payload);
      if (!saved.persistedToFirestore) {
        const mappedAddr: AddressItem = {
          id: saved.addressId,
          userId: saved.userId,
          recipientName: saved.recipientName,
          phone: saved.phone,
          streetAddress: saved.landmark
            ? `${saved.streetAddress} (${saved.landmark})`
            : saved.streetAddress,
          city: saved.city,
          state: saved.state,
          postalCode: saved.postalCode,
          deliveryInstructions: saved.deliveryInstructions,
          label: saved.label,
          isDefault: saved.isDefault,
        };
        setAddresses((prev) =>
          saved.isDefault
            ? [mappedAddr, ...prev.map((a) => ({ ...a, isDefault: false }))]
            : [mappedAddr, ...prev]
        );
      }

      setCurrentScreen(returnScreenAfterLocationSave);
      showToast(
        saved.persistedToFirestore
          ? `Saved ${saved.label} delivery address to Cloud Firestore (${saved.hasCoordinates ? 'Pin + Manual Postal' : 'Manual Postal'}).`
          : `Saved ${saved.label} delivery address in simulator preview.`
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setLocSubmitError(raw);
    } finally {
      setIsSavingLocation(false);
    }
  };

  const copyCode = (filename: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // Complete Flutter Source Codes for Previous Segments
  const previousFlutterFiles: Record<string, { path: string; language: string; content: string }> = {
    'customer_profile_screen.dart': {
      path: 'lib/features/profile/views/customer_profile_screen.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/profile_cubit.dart';
import '../models/user_profile_model.dart';

class CustomerProfileScreen extends StatelessWidget {
  const CustomerProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
      ),
      body: BlocConsumer<ProfileCubit, ProfileState>(
        listener: (context, state) {
          if (state is ProfileUpdated) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Profile updated successfully!'), backgroundColor: AppColors.success),
            );
          } else if (state is ProfileLoggedOut) {
            context.go('/welcome');
          } else if (state is ProfileError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
          }

          final user = (state is ProfileLoaded) ? state.user : UserProfileModel.mockCustomer();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Profile Avatar & Identity Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceWhite,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.borderLight),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    children: [
                      Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          CircleAvatar(
                            radius: 38,
                            backgroundColor: AppColors.primaryNavy,
                            child: Text(
                              user.initials,
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(color: AppColors.accentTeal, shape: BoxShape.circle),
                            child: const Icon(Icons.check, size: 12, color: Colors.white),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        user.fullName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryNavy),
                      ),
                      const SizedBox(height: 4),
                      Text(user.email, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      const SizedBox(height: 2),
                      Text(user.phone, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.accentTeal.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Verified Customer',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.accentTeal),
                        ),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: () => _showEditProfileDialog(context, user),
                        icon: const Icon(Icons.edit_outlined, size: 16),
                        label: const Text('Edit Profile'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primaryNavy,
                          side: const BorderSide(color: AppColors.borderLight),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Core Shortcuts
                _buildActionTile(
                  icon: Icons.location_on_outlined,
                  title: 'Saved Delivery Addresses',
                  subtitle: 'Manage delivery locations & default address',
                  onTap: () => context.push('/addresses'),
                ),
                const SizedBox(height: 10),
                _buildActionTile(
                  icon: Icons.receipt_long_outlined,
                  title: 'My Order History',
                  subtitle: 'Inspect orders, tracking & invoices',
                  onTap: () => context.push('/orders'),
                ),
                const SizedBox(height: 10),
                _buildActionTile(
                  icon: Icons.handyman_outlined,
                  title: 'Service & Maintenance Bookings',
                  subtitle: 'Schedule certified RO membrane inspection',
                  onTap: () => _showServiceModal(context),
                ),
                const SizedBox(height: 16),

                // Notification Preferences Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceWhite,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Notification Preferences',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primaryNavy),
                      ),
                      const SizedBox(height: 8),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Order & Dispatch Updates', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        subtitle: const Text('Real-time tracking notifications via SMS', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        value: user.notifications.orderUpdates,
                        activeColor: AppColors.accentTeal,
                        onChanged: (val) => context.read<ProfileCubit>().toggleNotification('orderUpdates', val),
                      ),
                      const Divider(height: 1),
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Filter Replacement Reminders', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        subtitle: const Text('Scheduled 6-month cartridge change alerts', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                        value: user.notifications.filterReminders,
                        activeColor: AppColors.accentTeal,
                        onChanged: (val) => context.read<ProfileCubit>().toggleNotification('filterReminders', val),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Logout Button
                ElevatedButton.icon(
                  onPressed: () => _confirmLogout(context),
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text('Log Out'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error.withOpacity(0.08),
                    foregroundColor: AppColors.error,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildActionTile({required IconData icon, required String title, required String subtitle, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceWhite,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderLight),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.accentTeal.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: AppColors.accentTeal, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }

  void _showEditProfileDialog(BuildContext context, UserProfileModel user) {
    final nameCtrl = TextEditingController(text: user.fullName);
    final phoneCtrl = TextEditingController(text: user.phone);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Edit Profile Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 16),
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder())),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                context.read<ProfileCubit>().updateProfile(name: nameCtrl.text.trim(), phone: phoneCtrl.text.trim());
                Navigator.pop(sheetContext);
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryNavy, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
              child: const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (dlgContext) => AlertDialog(
        title: const Text('Log Out?'),
        content: const Text('Are you sure you want to log out from your Califnco account?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dlgContext), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(dlgContext);
              context.read<ProfileCubit>().signOut();
            },
            child: const Text('Log Out', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showServiceModal(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Service Bookings'),
        content: const Text('All Califnco residential systems include periodic water health checks. A specialist visit can be dispatched anytime.'),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close'))],
      ),
    );
  }
}`,
    },
    'address_management_screen.dart': {
      path: 'lib/features/profile/views/address_management_screen.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/address_cubit.dart';
import '../models/address_model.dart';
import '../widgets/address_form_dialog.dart';

class AddressManagementScreen extends StatefulWidget {
  final String userId;
  const AddressManagementScreen({super.key, required this.userId});

  @override
  State<AddressManagementScreen> createState() => _AddressManagementScreenState();
}

class _AddressManagementScreenState extends State<AddressManagementScreen> {
  @override
  void initState() {
    super.initState();
    context.read<AddressCubit>().loadAddresses(widget.userId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Saved Addresses', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<AddressCubit, AddressState>(
        listener: (context, state) {
          if (state is AddressOperationSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.success),
            );
          } else if (state is AddressError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: AppColors.error),
            );
          }
        },
        builder: (context, state) {
          if (state is AddressLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
          }

          if (state is AddressLoaded) {
            if (state.addresses.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.location_off_outlined, size: 56, color: AppColors.textMuted),
                      const SizedBox(height: 12),
                      const Text('No Saved Addresses', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primaryNavy)),
                      const SizedBox(height: 6),
                      const Text('Add your delivery address for fast checkout.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: () => _openAddressForm(context),
                        icon: const Icon(Icons.add),
                        label: const Text('Add Address'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryNavy, foregroundColor: Colors.white),
                      ),
                    ],
                  ),
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: state.addresses.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final address = state.addresses[index];
                return _buildAddressCard(context, address);
              },
            );
          }

          return const SizedBox.shrink();
        },
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: AppColors.surfaceWhite,
          border: Border(top: BorderSide(color: AppColors.borderLight)),
        ),
        child: ElevatedButton.icon(
          onPressed: () => _openAddressForm(context),
          icon: const Icon(Icons.add_location_alt_outlined),
          label: const Text('Add New Address', style: TextStyle(fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryNavy,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
    );
  }

  Widget _buildAddressCard(BuildContext context, AddressModel address) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: address.isDefault ? AppColors.accentTeal : AppColors.borderLight,
          width: address.isDefault ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  address.label.toUpperCase(),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.primaryNavy),
                ),
              ),
              const SizedBox(width: 8),
              if (address.isDefault)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.accentTeal.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'DEFAULT',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.accentTeal),
                  ),
                ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primaryNavy),
                onPressed: () => _openAddressForm(context, existingAddress: address),
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppColors.error),
                onPressed: () => _confirmDelete(context, address),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(address.recipientName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primaryNavy)),
          const SizedBox(height: 2),
          Text(address.phone, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          const SizedBox(height: 6),
          Text(
            '\${address.streetAddress}, \${address.city}, \${address.state} - \${address.postalCode}',
            style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, height: 1.4),
          ),
          if (address.deliveryInstructions != null && address.deliveryInstructions!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 14, color: AppColors.accentTeal),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Instructions: \${address.deliveryInstructions}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (!address.isDefault) ...[
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: () => context.read<AddressCubit>().setDefaultAddress(address.id, widget.userId),
              icon: const Icon(Icons.check_circle_outline, size: 16),
              label: const Text('Set as Default Address', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.accentTeal,
                padding: EdgeInsets.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _openAddressForm(BuildContext context, {AddressModel? existingAddress}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => AddressFormDialog(
        userId: widget.userId,
        existingAddress: existingAddress,
      ),
    );
  }

  void _confirmDelete(BuildContext context, AddressModel address) {
    showDialog(
      context: context,
      builder: (dlgContext) => AlertDialog(
        title: const Text('Delete Address?'),
        content: Text('Are you sure you want to delete this address for "\${address.recipientName}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dlgContext), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              Navigator.pop(dlgContext);
              context.read<AddressCubit>().deleteAddress(address.id, widget.userId);
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}`,
    },
    'address_model.dart': {
      path: 'lib/features/profile/models/address_model.dart',
      language: 'dart',
      content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:equatable/equatable.dart';

class AddressModel extends Equatable {
  final String id;
  final String userId;
  final String recipientName;
  final String phone;
  final String streetAddress;
  final String city;
  final String state;
  final String postalCode;
  final String? deliveryInstructions;
  final String label; // 'Home' | 'Work' | 'Other'
  final bool isDefault;
  final DateTime createdAt;

  const AddressModel({
    required this.id,
    required this.userId,
    required this.recipientName,
    required this.phone,
    required this.streetAddress,
    required this.city,
    required this.state,
    required this.postalCode,
    this.deliveryInstructions,
    this.label = 'Home',
    this.isDefault = false,
    required this.createdAt,
  });

  factory AddressModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return AddressModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      recipientName: data['recipientName'] ?? '',
      phone: data['phone'] ?? '',
      streetAddress: data['streetAddress'] ?? '',
      city: data['city'] ?? '',
      state: data['state'] ?? '',
      postalCode: data['postalCode'] ?? '',
      deliveryInstructions: data['deliveryInstructions'],
      label: data['label'] ?? 'Home',
      isDefault: data['isDefault'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'recipientName': recipientName,
      'phone': phone,
      'streetAddress': streetAddress,
      'city': city,
      'state': state,
      'postalCode': postalCode,
      'deliveryInstructions': deliveryInstructions,
      'label': label,
      'isDefault': isDefault,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  AddressModel copyWith({
    String? id,
    String? userId,
    String? recipientName,
    String? phone,
    String? streetAddress,
    String? city,
    String? state,
    String? postalCode,
    String? deliveryInstructions,
    String? label,
    bool? isDefault,
    DateTime? createdAt,
  }) {
    return AddressModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      recipientName: recipientName ?? this.recipientName,
      phone: phone ?? this.phone,
      streetAddress: streetAddress ?? this.streetAddress,
      city: city ?? this.city,
      state: state ?? this.state,
      postalCode: postalCode ?? this.postalCode,
      deliveryInstructions: deliveryInstructions ?? this.deliveryInstructions,
      label: label ?? this.label,
      isDefault: isDefault ?? this.isDefault,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [id, userId, recipientName, phone, streetAddress, city, state, postalCode, isDefault];
}`,
    },
    'address_repository.dart': {
      path: 'lib/features/profile/repository/address_repository.dart',
      language: 'dart',
      content: `import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/address_model.dart';

abstract class IAddressRepository {
  Future<List<AddressModel>> getUserAddresses(String userId);
  Future<void> saveAddress(AddressModel address);
  Future<void> updateAddress(AddressModel address);
  Future<void> deleteAddress(String addressId, String userId);
  Future<void> setDefaultAddress(String addressId, String userId);
}

class FirestoreAddressRepository implements IAddressRepository {
  final FirebaseFirestore _firestore;

  FirestoreAddressRepository({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Future<List<AddressModel>> getUserAddresses(String userId) async {
    // SECURITY ENFORCEMENT: Strictly scoped to current user UID
    final snapshot = await _firestore
        .collection('addresses')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .get();

    return snapshot.docs.map((doc) => AddressModel.fromFirestore(doc)).toList();
  }

  @override
  Future<void> saveAddress(AddressModel address) async {
    final batch = _firestore.batch();
    final addressRef = _firestore.collection('addresses').doc();

    if (address.isDefault) {
      // Clear previous default addresses for this user
      final existingDefaults = await _firestore
          .collection('addresses')
          .where('userId', isEqualTo: address.userId)
          .where('isDefault', isEqualTo: true)
          .get();

      for (var doc in existingDefaults.docs) {
        batch.update(doc.reference, {'isDefault': false});
      }
    }

    batch.set(addressRef, address.copyWith(id: addressRef.id).toFirestore());
    await batch.commit();
  }

  @override
  Future<void> updateAddress(AddressModel address) async {
    final batch = _firestore.batch();
    final addressRef = _firestore.collection('addresses').doc(address.id);

    if (address.isDefault) {
      final existingDefaults = await _firestore
          .collection('addresses')
          .where('userId', isEqualTo: address.userId)
          .where('isDefault', isEqualTo: true)
          .get();

      for (var doc in existingDefaults.docs) {
        if (doc.id != address.id) {
          batch.update(doc.reference, {'isDefault': false});
        }
      }
    }

    batch.update(addressRef, address.toFirestore());
    await batch.commit();
  }

  @override
  Future<void> deleteAddress(String addressId, String userId) async {
    await _firestore.collection('addresses').doc(addressId).delete();
  }

  @override
  Future<void> setDefaultAddress(String addressId, String userId) async {
    final batch = _firestore.batch();
    final userAddresses = await _firestore
        .collection('addresses')
        .where('userId', isEqualTo: userId)
        .get();

    for (var doc in userAddresses.docs) {
      batch.update(doc.reference, {'isDefault': doc.id == addressId});
    }

    await batch.commit();
  }
}`,
    },
    'profile_cubit.dart': {
      path: 'lib/features/profile/cubit/profile_cubit.dart',
      language: 'dart',
      content: `import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_profile_model.dart';

part 'profile_state.dart';

class ProfileCubit extends Cubit<ProfileState> {
  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;

  ProfileCubit({FirebaseAuth? auth, FirebaseFirestore? firestore})
      : _auth = auth ?? FirebaseAuth.instance,
        _firestore = firestore ?? FirebaseFirestore.instance,
        super(ProfileInitial());

  Future<void> loadProfile() async {
    emit(ProfileLoading());
    try {
      final user = _auth.currentUser;
      if (user == null) {
        emit(const ProfileError('User session expired. Please sign in again.'));
        return;
      }

      final doc = await _firestore.collection('users').doc(user.uid).get();
      if (doc.exists) {
        final profile = UserProfileModel.fromFirestore(doc);
        emit(ProfileLoaded(profile));
      } else {
        // Fallback for demo authentication
        emit(ProfileLoaded(UserProfileModel.mockCustomer()));
      }
    } catch (e) {
      emit(ProfileError('Failed to load profile: \${e.toString()}'));
    }
  }

  Future<void> updateProfile({required String name, required String phone}) async {
    try {
      final user = _auth.currentUser;
      if (user != null) {
        await _firestore.collection('users').doc(user.uid).update({
          'fullName': name,
          'phone': phone,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
      emit(ProfileUpdated(name: name, phone: phone));
      loadProfile();
    } catch (e) {
      emit(ProfileError('Could not update profile: \${e.toString()}'));
    }
  }

  Future<void> toggleNotification(String key, bool value) async {
    // Update notification preferences in firestore user document
  }

  Future<void> signOut() async {
    emit(ProfileLoading());
    await _auth.signOut();
    emit(ProfileLoggedOut());
  }
}`,
    },
    'address_cubit.dart': {
      path: 'lib/features/profile/cubit/address_cubit.dart',
      language: 'dart',
      content: `import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../models/address_model.dart';
import '../repository/address_repository.dart';

part 'address_state.dart';

class AddressCubit extends Cubit<AddressState> {
  final IAddressRepository _repository;

  AddressCubit(this._repository) : super(AddressInitial());

  Future<void> loadAddresses(String userId) async {
    emit(AddressLoading());
    try {
      final list = await _repository.getUserAddresses(userId);
      emit(AddressLoaded(list));
    } catch (e) {
      emit(AddressError('Failed to load saved addresses: \${e.toString()}'));
    }
  }

  Future<void> addAddress(AddressModel address) async {
    try {
      await _repository.saveAddress(address);
      emit(const AddressOperationSuccess('Address saved successfully!'));
      loadAddresses(address.userId);
    } catch (e) {
      emit(AddressError('Failed to save address: \${e.toString()}'));
    }
  }

  Future<void> updateAddress(AddressModel address) async {
    try {
      await _repository.updateAddress(address);
      emit(const AddressOperationSuccess('Address updated successfully!'));
      loadAddresses(address.userId);
    } catch (e) {
      emit(AddressError('Failed to update address: \${e.toString()}'));
    }
  }

  Future<void> deleteAddress(String addressId, String userId) async {
    try {
      await _repository.deleteAddress(addressId, userId);
      emit(const AddressOperationSuccess('Address deleted.'));
      loadAddresses(userId);
    } catch (e) {
      emit(AddressError('Failed to delete address: \${e.toString()}'));
    }
  }

  Future<void> setDefaultAddress(String addressId, String userId) async {
    try {
      await _repository.setDefaultAddress(addressId, userId);
      emit(const AddressOperationSuccess('Default delivery address updated.'));
      loadAddresses(userId);
    } catch (e) {
      emit(AddressError('Failed to set default address: \${e.toString()}'));
    }
  }
}`,
    },
    'address_form_dialog.dart': {
      path: 'lib/features/profile/widgets/address_form_dialog.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/address_cubit.dart';
import '../models/address_model.dart';

class AddressFormDialog extends StatefulWidget {
  final String userId;
  final AddressModel? existingAddress;

  const AddressFormDialog({super.key, required this.userId, this.existingAddress});

  @override
  State<AddressFormDialog> createState() => _AddressFormDialogState();
}

class _AddressFormDialogState extends State<AddressFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _streetController;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _postalController;
  late TextEditingController _instructionsController;

  String _selectedLabel = 'Home';
  bool _isDefault = false;

  @override
  void initState() {
    super.initState();
    final a = widget.existingAddress;
    _nameController = TextEditingController(text: a?.recipientName ?? '');
    _phoneController = TextEditingController(text: a?.phone ?? '');
    _streetController = TextEditingController(text: a?.streetAddress ?? '');
    _cityController = TextEditingController(text: a?.city ?? 'Mumbai');
    _stateController = TextEditingController(text: a?.state ?? 'Maharashtra');
    _postalController = TextEditingController(text: a?.postalCode ?? '');
    _instructionsController = TextEditingController(text: a?.deliveryInstructions ?? '');
    _selectedLabel = a?.label ?? 'Home';
    _isDefault = a?.isDefault ?? false;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _postalController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final address = AddressModel(
      id: widget.existingAddress?.id ?? '',
      userId: widget.userId,
      recipientName: _nameController.text.trim(),
      phone: _phoneController.text.trim(),
      streetAddress: _streetController.text.trim(),
      city: _cityController.text.trim(),
      state: _stateController.text.trim(),
      postalCode: _postalController.text.trim(),
      deliveryInstructions: _instructionsController.text.trim().isEmpty ? null : _instructionsController.text.trim(),
      label: _selectedLabel,
      isDefault: _isDefault,
      createdAt: widget.existingAddress?.createdAt ?? DateTime.now(),
    );

    if (widget.existingAddress == null) {
      context.read<AddressCubit>().addAddress(address);
    } else {
      context.read<AddressCubit>().updateAddress(address);
    }

    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.existingAddress != null;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                isEdit ? 'Edit Delivery Address' : 'Add New Delivery Address',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primaryNavy),
              ),
              const SizedBox(height: 16),

              // Label Chips
              Row(
                children: ['Home', 'Work', 'Other'].map((l) {
                  final isSelected = _selectedLabel == l;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(l),
                      selected: isSelected,
                      selectedColor: AppColors.accentTeal.withOpacity(0.2),
                      labelStyle: TextStyle(
                        color: isSelected ? AppColors.accentTeal : AppColors.textSecondary,
                        fontWeight: FontWeight.bold,
                      ),
                      onSelected: (_) => setState(() => _selectedLabel = l),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Recipient Full Name', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.isEmpty) ? 'Please enter recipient name' : null,
              ),
              const SizedBox(height: 10),

              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Contact Phone Number', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.length < 10) ? 'Enter valid 10-digit phone' : null,
              ),
              const SizedBox(height: 10),

              TextFormField(
                controller: _streetController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Street Address, Flat / House No.', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.isEmpty) ? 'Please enter street address' : null,
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _cityController,
                      decoration: const InputDecoration(labelText: 'City', border: OutlineInputBorder()),
                      validator: (v) => (v == null || v.isEmpty) ? 'Enter city' : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _postalController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Postal / PIN Code', border: OutlineInputBorder()),
                      validator: (v) => (v == null || v.length != 6) ? 'Enter 6-digit PIN' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              TextFormField(
                controller: _stateController,
                decoration: const InputDecoration(labelText: 'State', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),

              TextFormField(
                controller: _instructionsController,
                decoration: const InputDecoration(
                  labelText: 'Delivery Instructions (Optional)',
                  hintText: 'e.g. Ring bell twice, leave with security',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),

              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Set as Default Delivery Address', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                value: _isDefault,
                activeColor: AppColors.accentTeal,
                onChanged: (v) => setState(() => _isDefault = v ?? false),
              ),
              const SizedBox(height: 16),

              ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryNavy,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(isEdit ? 'Update Address' : 'Save Address', style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}`,
    },
    'order_history_state.dart': {
      path: 'lib/features/orders/cubit/order_history_state.dart',
      language: 'dart',
      content: `part of 'order_history_cubit.dart';

abstract class OrderHistoryState extends Equatable {
  const OrderHistoryState();
  @override
  List<Object?> get props => [];
}

class OrderHistoryInitial extends OrderHistoryState {}

class OrderHistoryLoading extends OrderHistoryState {}

class OrderHistoryLoaded extends OrderHistoryState {
  final List<OrderModel> orders;
  const OrderHistoryLoaded(this.orders);
  @override
  List<Object?> get props => [orders];
}

class OrderHistoryEmpty extends OrderHistoryState {}

class OrderHistoryError extends OrderHistoryState {
  final String message;
  const OrderHistoryError(this.message);
  @override
  List<Object?> get props => [message];
}`,
    },
    'order_history_screen.dart': {
      path: 'lib/features/orders/views/order_history_screen.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/order_history_cubit.dart';
import '../models/order_model.dart';

class OrderHistoryScreen extends StatefulWidget {
  final String userId;
  const OrderHistoryScreen({super.key, required this.userId});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  @override
  void initState() {
    super.initState();
    context.read<OrderHistoryCubit>().loadUserOrders(widget.userId);
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.delivered:
        return AppColors.success;
      case OrderStatus.processing:
      case OrderStatus.shipped:
        return AppColors.accentTeal;
      case OrderStatus.confirmed:
        return AppColors.primaryNavy;
      case OrderStatus.cancelled:
        return AppColors.error;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Orders', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: BlocBuilder<OrderHistoryCubit, OrderHistoryState>(
        builder: (context, state) {
          if (state is OrderHistoryLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
          }

          if (state is OrderHistoryError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
                    const SizedBox(height: 12),
                    Text(state.message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.read<OrderHistoryCubit>().loadUserOrders(widget.userId),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (state is OrderHistoryEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.receipt_long_outlined, size: 64, color: AppColors.textMuted),
                    const SizedBox(height: 16),
                    const Text('No Orders Found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryNavy)),
                    const SizedBox(height: 8),
                    const Text('You have not placed any orders yet. Discover our certified water purification catalog.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => context.go('/catalog'),
                      child: const Text('Explore Purifiers'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (state is OrderHistoryLoaded) {
            final orders = state.orders;

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final order = orders[index];
                final isPaid = order.paymentStatus == PaymentStatus.verified;

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceWhite,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.borderLight),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryNavy.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('#\${order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.primaryNavy)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _getStatusColor(order.orderStatus).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              order.orderStatus.name.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _getStatusColor(order.orderStatus),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('Placed on \${order.createdAt.toString().substring(0, 10)}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      const Divider(height: 20),

                      // Item summary
                      Text(
                        '\${order.items.length} item\${order.items.length > 1 ? 's' : ''} • ₹\${order.totalAmount.toInt()}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            isPaid ? Icons.check_circle_outline : Icons.access_time_rounded,
                            size: 14,
                            color: isPaid ? AppColors.success : AppColors.warning,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isPaid ? 'Payment Verified (Razorpay)' : 'Payment Pending (COD)',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isPaid ? AppColors.success : AppColors.warning,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // View Details CTA
                      OutlinedButton(
                        onPressed: () => context.push('/order/\${order.id}', extra: order),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(38),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('View Order Details', style: TextStyle(fontSize: 12)),
                            SizedBox(width: 6),
                            Icon(Icons.arrow_forward_ios_rounded, size: 12),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}`,
    },
    'order_detail_view_screen.dart': {
      path: 'lib/features/orders/views/order_detail_view_screen.dart',
      language: 'dart',
      content: `import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../models/order_model.dart';

class OrderDetailViewScreen extends StatelessWidget {
  final OrderModel order;
  const OrderDetailViewScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final isPaid = order.paymentStatus == PaymentStatus.verified;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('#\${order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Fulfilment Status', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      Text(
                        order.orderStatus.name.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.primaryNavy),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (order.estimatedDelivery != null) ...[
                    Row(
                      children: [
                        const Icon(Icons.local_shipping_outlined, size: 16, color: AppColors.accentTeal),
                        const SizedBox(width: 6),
                        Text(order.estimatedDelivery!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accentTeal)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Fulfilment Timeline
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Tracking Milestones', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primaryNavy)),
                  const SizedBox(height: 16),
                  _buildTimelineTile('1. Order Placed & Confirmed', true, isLast: false),
                  _buildTimelineTile('2. Certified Pre-Dispatch Water Quality Inspection', true, isLast: false),
                  _buildTimelineTile('3. Handed over to Installation Specialist', order.orderStatus == OrderStatus.shipped || order.orderStatus == OrderStatus.delivered, isLast: false),
                  _buildTimelineTile('4. Delivered & Installed at Customer Location', order.orderStatus == OrderStatus.delivered, isLast: true),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Item Breakdown
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Purchased Purifiers & Consumables', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primaryNavy)),
                  const SizedBox(height: 12),
                  ...order.items.map((item) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text('\${item.quantity}x \${item.product.name}', style: const TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                        ),
                        Text('₹\${(item.product.retailPrice * item.quantity).toInt()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                  )),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount Paid', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      Text('₹\${order.totalAmount.toInt()}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.primaryNavy)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Installation Support CTA
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cyanMuted,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.accentTeal.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.support_agent_rounded, color: AppColors.accentTeal, size: 20),
                      SizedBox(width: 8),
                      Text('Califnco Installation Support', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Need assistance with your water purifier or looking to reschedule technician installation?',
                    style: TextStyle(fontSize: 11, color: AppColors.textSecondary, height: 1.4),
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Connecting to Califnco Technician Dispatch...')),
                      );
                    },
                    style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(36)),
                    child: const Text('Contact Installation Specialist', style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineTile(String title, bool isCompleted, {required bool isLast}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: isCompleted ? AppColors.accentTeal : Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(color: isCompleted ? AppColors.accentTeal : AppColors.borderLight, width: 2),
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 32,
                color: isCompleted ? AppColors.accentTeal : AppColors.borderLight,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isCompleted ? FontWeight.bold : FontWeight.normal,
              color: isCompleted ? AppColors.primaryNavy : AppColors.textMuted,
            ),
          ),
        ),
      ],
    );
  }
}`,
    },
  };

  const flutterFiles =
    segmentCodeTab === 'segment11'
      ? FLUTTER_FILES_SEGMENT_11
      : segmentCodeTab === 'segment10'
      ? FLUTTER_FILES_SEGMENT_10
      : segmentCodeTab === 'segment9'
      ? FLUTTER_FILES_SEGMENT_9
      : FLUTTER_FILES_SEGMENT_8;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Studio Control (3-Zone Contract) */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <Droplets className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="font-bold text-base tracking-tight text-white">
            Califnco Mobile
          </span>
        </div>

        {/* Navigation Links / Studio Views */}
        <nav className="flex items-center gap-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'simulator'
                ? 'border-teal-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Simulator
          </button>
          <button
            type="button"
            onClick={() => {
              setSegmentCodeTab('segment11');
              setSelectedCodeFile('notifications_screen.dart');
              setActiveTab('code');
            }}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'code'
                ? 'border-teal-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Flutter Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'instructions'
                ? 'border-teal-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Testing Guide
          </button>
          {onOpenAdminConsole && (
            <button
              type="button"
              onClick={onOpenAdminConsole}
              className="py-1.5 text-slate-400 hover:text-teal-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 border-transparent"
            >
              Admin Console
            </button>
          )}
        </nav>

        {/* Primary Action: Live Firebase Auth for Firestore Persistence */}
        <div className="flex items-center gap-3 shrink-0">
          {firebaseUser ? (
            <button
              type="button"
              onClick={async () => {
                await revokeWebDeviceTokenOnSignOut(firebaseUser.uid);
                await signOut(auth);
                showToast('Revoked device FCM token and signed out of Firebase session.');
              }}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={`Connected to Cloud Firestore as ${firebaseUser.email || firebaseUser.uid}`}
            >
              Firestore Live · Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMobileGoogleSignIn}
              className="px-3.5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Connect Google Auth
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'simulator' && (
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 overflow-y-auto">
            {/* Interactive Phone Frame */}
            <div
              className={`transition-all duration-300 relative shadow-2xl rounded-[44px] p-3 bg-gradient-to-b from-slate-700 to-slate-950 border-4 border-slate-600/70 ${
                deviceModel === 'pixel'
                  ? 'w-[390px] h-[790px]'
                  : deviceModel === 'galaxy'
                  ? 'w-[412px] h-[830px]'
                  : 'w-[360px] h-[730px]'
              }`}
            >
              {/* Phone Camera Hole */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-30 ring-1 ring-slate-800" />

              {/* Mobile Screen Surface */}
              <div className="w-full h-full bg-slate-50 rounded-[36px] overflow-hidden flex flex-col text-slate-900 relative shadow-inner">
                {/* Android Status Bar */}
                <div className="h-9 px-6 pt-2 flex items-center justify-between text-xs font-semibold text-slate-800 select-none z-20 shrink-0 bg-white border-b border-slate-100">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <span className="text-[10px]">5G</span>
                    <div className="w-4 h-2.5 border border-slate-700 rounded-sm p-0.5 flex items-center">
                      <div className="h-full w-full bg-slate-800 rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* ================= SCREEN 1: WELCOME SCREEN ================= */}
                {currentScreen === 'welcome' && (
                  <div className="flex-1 flex flex-col bg-white overflow-hidden p-6 text-center justify-between">
                    <div className="pt-4 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-3 shadow-xs">
                        <Droplets className="w-8 h-8" />
                      </div>
                      <h1 className="text-xl font-black tracking-tight text-[#0A2540]">CALIFNCO</h1>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-teal-600">Pure Water Technologies</span>
                    </div>

                    <div className="my-auto py-2">
                      <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-100 mb-5 bg-slate-50">
                        <img src={IMG_PURIFIER} alt="Califnco Purifier" className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-xl font-extrabold text-[#0A2540] tracking-tight">Pure Water. Better Living.</h2>
                      <p className="text-xs text-slate-500 mt-2 px-4 leading-relaxed">
                        Discover certified residential and commercial water purification systems, dispensers, and authentic replacement filters.
                      </p>
                    </div>

                    <div className="space-y-2.5 pb-2">
                      <button
                        onClick={() => setCurrentScreen('login')}
                        className="w-full py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentScreen('login')}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] rounded-xl font-semibold text-xs"
                      >
                        I already have an account
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 2: LOGIN SCREEN ================= */}
                {currentScreen === 'login' && (
                  <div className="flex-1 flex flex-col bg-white overflow-y-auto p-6 justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold">
                          <Droplets className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-xs tracking-wide text-[#0A2540]">CALIFNCO ACCESS</span>
                      </div>

                      <h2 className="text-lg font-black text-[#0A2540]">Welcome Back</h2>
                      <p className="text-xs text-slate-500 mb-4">Sign in to manage orders, purifiers, or B2B procurement</p>

                      {/* Account Role Selector */}
                      <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold" role="tablist" aria-label="Account Role">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthRole('customer');
                            setLoginEmail('sarah.jenkins@example.com');
                            setAuthFormError(null);
                          }}
                          className={`flex-1 min-h-[40px] py-1.5 rounded-lg transition-colors cursor-pointer ${
                            authRole === 'customer' ? 'bg-white text-[#0A2540] shadow-xs font-bold' : 'text-slate-600'
                          }`}
                        >
                          Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthRole('dealer');
                            setLoginEmail('vikram@aquapuresolutions.in');
                            setAuthFormError(null);
                          }}
                          className={`flex-1 min-h-[40px] py-1.5 rounded-lg transition-colors cursor-pointer ${
                            authRole === 'dealer' ? 'bg-white text-[#0A2540] shadow-xs font-bold' : 'text-slate-600'
                          }`}
                        >
                          Dealer Partner
                        </button>
                      </div>

                      {authFormError && (
                        <div role="alert" className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>{authFormError}</span>
                        </div>
                      )}

                      {/* Form Inputs */}
                      <div className="space-y-3 text-xs">
                        <div>
                          <label htmlFor="mobile-login-email" className="block text-[11px] font-bold text-slate-700 mb-1">
                            Email Address
                          </label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-3 min-h-[44px] bg-slate-50 focus-within:border-teal-600 focus-within:bg-white">
                            <Mail className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                            <input
                              id="mobile-login-email"
                              type="email"
                              value={loginEmail}
                              onChange={(e) => {
                                setLoginEmail(e.target.value);
                                if (authFormError) setAuthFormError(null);
                              }}
                              placeholder="you@example.com"
                              className="w-full bg-transparent outline-none text-slate-900 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="mobile-login-password" className="block text-[11px] font-bold text-slate-700 mb-1">
                            Password
                          </label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-3 min-h-[44px] bg-slate-50 focus-within:border-teal-600 focus-within:bg-white">
                            <Lock className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                            <input
                              id="mobile-login-password"
                              type={showPassword ? 'text' : 'password'}
                              value={loginPassword}
                              onChange={(e) => {
                                setLoginPassword(e.target.value);
                                if (authFormError) setAuthFormError(null);
                              }}
                              className="w-full bg-transparent outline-none text-slate-900 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="min-h-[36px] px-2 text-slate-500 hover:text-slate-800 text-[10.5px] font-semibold cursor-pointer"
                            >
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthFormError(null);
                              setCurrentScreen('forgot_password');
                            }}
                            className="min-h-[36px] text-[11px] font-semibold text-teal-700 hover:underline cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-4">
                      <button
                        type="button"
                        onClick={handleAuthLoginSubmit}
                        className="w-full min-h-[44px] py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        Sign In as {authRole === 'customer' ? 'Customer' : 'Dealer Partner'}
                      </button>

                      {!firebaseUser && isFirebaseConfigured && (
                        <button
                          type="button"
                          onClick={handleMobileGoogleSignIn}
                          className="w-full min-h-[44px] py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Continue with Google (Live Firestore)
                        </button>
                      )}

                      <div className="text-center text-xs text-slate-500 pt-1">
                        Don&apos;t have an account?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthFormError(null);
                            setCurrentScreen('register');
                          }}
                          className="font-bold text-teal-700 hover:underline cursor-pointer"
                        >
                          Register
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 3: REGISTRATION SCREEN ================= */}
                {currentScreen === 'register' && (
                  <div className="flex-1 flex flex-col bg-white overflow-y-auto p-5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthFormError(null);
                        setCurrentScreen('login');
                      }}
                      className="flex items-center gap-1 min-h-[40px] text-slate-600 mb-2 hover:text-slate-900 cursor-pointer self-start"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Login</span>
                    </button>

                    <h2 className="text-lg font-black text-[#0A2540]">Create Account</h2>
                    <p className="text-slate-500 text-[11px] mb-3">Join Califnco for certified water purification systems</p>

                    <div className="flex bg-slate-100 p-1 rounded-xl mb-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthRole('customer');
                          setAuthFormError(null);
                        }}
                        className={`flex-1 min-h-[38px] py-1.5 rounded-lg cursor-pointer ${
                          authRole === 'customer' ? 'bg-white text-[#0A2540] shadow-xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        Customer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthRole('dealer');
                          setAuthFormError(null);
                        }}
                        className={`flex-1 min-h-[38px] py-1.5 rounded-lg cursor-pointer ${
                          authRole === 'dealer' ? 'bg-white text-[#0A2540] shadow-xs font-bold' : 'text-slate-600'
                        }`}
                      >
                        Dealer Applicant
                      </button>
                    </div>

                    {authFormError && (
                      <div role="alert" className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{authFormError}</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Full Name</label>
                        <input
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white"
                        />
                      </div>
                      {authRole === 'dealer' && (
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Registered Business Name</label>
                          <input
                            value={regBusinessName}
                            onChange={(e) => setRegBusinessName(e.target.value)}
                            className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Email Address</label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Phone Number</label>
                        <input
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 focus:bg-white"
                        />
                      </div>
                      {authRole === 'dealer' && (
                        <>
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10.5px] text-amber-950 leading-relaxed">
                            <strong>Compliance Gate:</strong> New dealer accounts start as <strong>Pending</strong>. Wholesale margins and bulk PO checkout unlock only after administrator verification.
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">15-Digit GSTIN</label>
                            <input
                              value={regGstin}
                              maxLength={15}
                              onChange={(e) => setRegGstin(e.target.value.toUpperCase())}
                              className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono uppercase tabular-nums bg-slate-50 focus:bg-white"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Password (min 8 characters)</label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAuthRegisterSubmit}
                      className="mt-4 w-full min-h-[44px] py-2.5 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                    >
                      {authRole === 'dealer' ? 'Submit Dealer Application' : 'Complete Registration'}
                    </button>
                  </div>
                )}

                {/* ================= SCREEN 4: FORGOT PASSWORD ================= */}
                {currentScreen === 'forgot_password' && (
                  <div className="flex-1 flex flex-col bg-white p-6 justify-between text-xs">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthFormError(null);
                          setCurrentScreen('login');
                        }}
                        className="flex items-center gap-1 min-h-[40px] text-slate-600 mb-4 hover:text-slate-900 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Login</span>
                      </button>
                      <h2 className="text-lg font-black text-[#0A2540]">Reset Password</h2>
                      <p className="text-slate-500 text-xs mt-1 mb-4 leading-relaxed">
                        Enter your registered email address to request a Firebase Authentication password reset link.
                      </p>
                      {authFormError && (
                        <div role="alert" className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800">
                          {authFormError}
                        </div>
                      )}
                      <label htmlFor="reset-email-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                        Registered Email
                      </label>
                      <input
                        id="reset-email-input"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          if (authFormError) setAuthFormError(null);
                        }}
                        className="w-full min-h-[44px] border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
                          setAuthFormError('Please enter a valid registered email address.');
                          return;
                        }
                        setAuthFormError(null);
                        showToast(`Password reset instructions queued for ${resetEmail.trim()}.`);
                        setCurrentScreen('login');
                      }}
                      className="w-full min-h-[44px] py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Send Reset Email
                    </button>
                  </div>
                )}

                {/* ================= SCREEN 5: CUSTOMER HOME SCREEN ================= */}
                {currentScreen === 'home' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Header */}
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 shrink-0 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReturnScreenAfterLocationSave('home');
                          setCurrentScreen('delivery_location');
                        }}
                        className="text-left min-w-0 min-h-[44px] flex flex-col justify-center cursor-pointer"
                      >
                        <p className="text-[10px] text-teal-700 font-semibold truncate font-mono tabular-nums">
                          Deliver to {defaultDeliveryAddress.city} {defaultDeliveryAddress.postalCode} ▾
                        </p>
                        <h2 className="text-sm font-extrabold text-[#0A2540] truncate">
                          Hello, {profile.fullName.split(' ')[0]}
                        </h2>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('notifications')}
                          aria-label="Open Notifications"
                          className="relative min-w-[44px] min-h-[44px] rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                          {unreadNotificationCount > 0 && (
                            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#0A2540] text-white text-[9px] font-mono tabular-nums font-bold flex items-center justify-center">
                              {unreadNotificationCount}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('cart')}
                          aria-label="Open Shopping Cart"
                          className="relative min-w-[44px] min-h-[44px] rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {cartCount > 0 && (
                            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-teal-600 text-white text-[9px] font-mono tabular-nums font-bold flex items-center justify-center">
                              {cartCount}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Feed */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-16">
                      {/* Search Entry */}
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('catalog')}
                        className="w-full min-h-[44px] flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-500 text-xs transition-colors cursor-pointer text-left"
                      >
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>Search RO purifiers, dispensers, filters, pumps...</span>
                      </button>

                      {/* Brand Promise Banner */}
                      <div className="bg-[#0A2540] text-white p-4 rounded-2xl border border-slate-800">
                        <span className="text-[9.5px] uppercase tracking-wider font-bold text-teal-300">
                          Califnco Certified Care
                        </span>
                        <h3 className="text-sm font-black mt-1">8-Stage RO+UV+Copper Purification</h3>
                        <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
                          Includes certified doorstep installation and 1-year RO membrane warranty across India.
                        </p>
                      </div>

                      {/* Categories */}
                      <div className="flex gap-2 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                        {[
                          { label: 'All', value: 'All' },
                          { label: 'Purifiers', value: 'Water Purifiers' },
                          { label: 'Dispensers', value: 'Dispensers' },
                          { label: 'Pumps', value: 'Pumps' },
                          { label: 'Filters', value: 'Filters' },
                          { label: 'Spare Parts', value: 'Spare Parts' },
                        ].map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => {
                              setCatalogCategory(cat.value);
                              setCurrentScreen('catalog');
                            }}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-600 font-semibold text-[#0A2540] whitespace-nowrap transition-colors cursor-pointer"
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Featured Flagship Purifier */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider">
                            Featured Flagship
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">
                            In Stock ({WHOLESALE_CATALOG_PRODUCTS[0].stockQuantity})
                          </span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <ProductStudioImage
                            src={WHOLESALE_CATALOG_PRODUCTS[0].imageUrl}
                            alt={WHOLESALE_CATALOG_PRODUCTS[0].name}
                            className="w-20 h-20 rounded-xl"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-xs text-[#0A2540] leading-snug">
                              {WHOLESALE_CATALOG_PRODUCTS[0].name}
                            </h4>
                            <div className="flex items-center gap-1 text-[10.5px] text-amber-600 font-bold my-1 tabular-nums">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>
                                {WHOLESALE_CATALOG_PRODUCTS[0].rating} ({WHOLESALE_CATALOG_PRODUCTS[0].reviewCount} reviews)
                              </span>
                            </div>
                            <span className="text-sm font-black text-[#0A2540] font-mono tabular-nums">
                              ₹{WHOLESALE_CATALOG_PRODUCTS[0].retailPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRetailProduct(WHOLESALE_CATALOG_PRODUCTS[0]);
                              setDetailQty(1);
                              setCurrentScreen('details');
                            }}
                            className="flex-1 min-h-[42px] py-2 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() => addToRetailCart(WHOLESALE_CATALOG_PRODUCTS[0], 1)}
                            className="min-h-[42px] px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {/* Service Booking Quick Entry Card (Screen 23) */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-[#0A2540]">
                            Purifier Installation, Maintenance &amp; Repair
                          </h4>
                          <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                            Submit a service request for technician scheduling.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('service_booking')}
                          className="px-3.5 py-2 min-h-[42px] bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                        >
                          Book Service
                        </button>
                      </div>
                    </div>

                    {/* Unified 5-Tab Customer Bottom Nav */}
                    <div className="h-14 bg-white border-t border-slate-200 px-3 flex items-center justify-between text-slate-500 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('home')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#0A2540] font-bold cursor-pointer"
                      >
                        <Home className="w-4 h-4 text-teal-700" />
                        <span className="text-[10px]">Home</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('catalog')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <Grid className="w-4 h-4" />
                        <span className="text-[10px]">Catalog</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('cart')}
                        className="relative min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Cart</span>
                        {cartCount > 0 && (
                          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-teal-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_history')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px]">Orders</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('profile')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-[10px]">Profile</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 6: PRODUCT CATALOG SCREEN ================= */}
                {currentScreen === 'catalog' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 shrink-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-extrabold text-[#0A2540]">Water Catalog</h2>
                        <div className="flex items-center gap-2">
                          <select
                            aria-label="Sort catalog products"
                            value={retailSort}
                            onChange={(e) =>
                              setRetailSort(
                                e.target.value as 'featured' | 'price_asc' | 'price_desc' | 'rating'
                              )
                            }
                            className="min-h-[34px] text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer"
                          >
                            <option value="featured">Sort: Featured</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="rating">Highest Rated</option>
                          </select>
                        </div>
                      </div>

                      {/* Live Search Input */}
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 focus-within:border-teal-600 focus-within:bg-white rounded-xl px-3 min-h-[42px]">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="search"
                          value={retailSearch}
                          onChange={(e) => setRetailSearch(e.target.value)}
                          placeholder="Search RO, dispenser, pump, membrane..."
                          className="w-full bg-transparent outline-none text-xs text-slate-900"
                        />
                        {retailSearch && (
                          <button
                            type="button"
                            onClick={() => setRetailSearch('')}
                            aria-label="Clear search"
                            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Filter Strip */}
                      <div className="flex gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
                        {['All', 'Water Purifiers', 'Dispensers', 'Pumps', 'Filters', 'Spare Parts'].map(
                          (cat) => {
                            const active = catalogCategory === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setCatalogCategory(cat)}
                                className={`min-h-[34px] px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                  active
                                    ? 'bg-[#0A2540] text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                {cat === 'Water Purifiers' ? 'Purifiers' : cat}
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3.5 pb-16">
                      {filteredRetailProducts.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2 mt-4">
                          <Search className="w-8 h-8 text-slate-300 mx-auto" />
                          <h3 className="text-xs font-extrabold text-[#0A2540]">
                            No Matching Water Systems
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            No products matched &ldquo;{retailSearch}&rdquo; in {catalogCategory}.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setRetailSearch('');
                              setCatalogCategory('All');
                            }}
                            className="mt-2 min-h-[40px] px-4 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Reset Search &amp; Filters
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          {filteredRetailProducts.map((prod) => (
                            <div
                              key={prod.id}
                              className="bg-white p-2.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between"
                            >
                              <div
                                onClick={() => {
                                  setSelectedRetailProduct(prod);
                                  setDetailQty(1);
                                  setCurrentScreen('details');
                                }}
                                className="cursor-pointer"
                              >
                                <ProductStudioImage
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-full h-28 rounded-xl mb-2"
                                />
                                <div className="flex items-center justify-between text-[9.5px] text-slate-500 mb-0.5">
                                  <span className="truncate font-semibold text-teal-700">
                                    {prod.category}
                                  </span>
                                  <span className="font-bold text-amber-600 tabular-nums shrink-0">
                                    ★ {prod.rating}
                                  </span>
                                </div>
                                <h4 className="font-bold text-[11.5px] text-[#0A2540] line-clamp-2 leading-snug min-h-[30px]">
                                  {prod.name}
                                </h4>
                              </div>

                              <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                                <span className="text-xs font-black text-[#0A2540] font-mono tabular-nums">
                                  ₹{prod.retailPrice.toLocaleString('en-IN')}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => addToRetailCart(prod, 1)}
                                  aria-label={`Add ${prod.name} to cart`}
                                  className="min-h-[36px] px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer"
                                >
                                  + Add
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unified 5-Tab Customer Bottom Nav */}
                    <div className="h-14 bg-white border-t border-slate-200 px-3 flex items-center justify-between text-slate-500 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('home')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <Home className="w-4 h-4" />
                        <span className="text-[10px]">Home</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('catalog')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#0A2540] font-bold cursor-pointer"
                      >
                        <Grid className="w-4 h-4 text-teal-700" />
                        <span className="text-[10px]">Catalog</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('cart')}
                        className="relative min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Cart</span>
                        {cartCount > 0 && (
                          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-teal-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_history')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px]">Orders</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('profile')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-[10px]">Profile</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 7: PRODUCT DETAILS SCREEN ================= */}
                {currentScreen === 'details' && (
                  <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('catalog')}
                        aria-label="Back to Catalog"
                        className="min-w-[40px] min-h-[40px] rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <span className="font-extrabold text-xs text-[#0A2540]">Product Specification</span>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('cart')}
                        aria-label="Open Cart"
                        className="relative min-w-[40px] min-h-[40px] rounded-xl text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {cartCount > 0 && (
                          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-teal-600 text-white text-[9px] font-mono tabular-nums font-bold flex items-center justify-center">
                            {cartCount}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-6">
                      <button
                        type="button"
                        onClick={() => setIsProductZoomOpen(true)}
                        className="w-full h-48 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative group cursor-pointer block"
                        aria-label={`Zoom ${selectedRetailProduct.name} image`}
                      >
                        <ProductStudioImage
                          src={selectedRetailProduct.imageUrl}
                          alt={selectedRetailProduct.name}
                          className="w-full h-full border-0 rounded-none"
                        />
                        <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-slate-900/80 text-white rounded-lg text-[10px] font-semibold inline-flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" />
                          <span>Tap to Inspect</span>
                        </span>
                      </button>

                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-teal-700 font-extrabold uppercase tracking-wider">
                            {selectedRetailProduct.category}
                          </span>
                          <span className="text-[10.5px] font-semibold text-emerald-700 tabular-nums">
                            In Stock · {selectedRetailProduct.stockQuantity} units
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-[#0A2540] leading-snug mt-0.5">
                          {selectedRetailProduct.name}
                        </h3>
                        <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                          {selectedRetailProduct.description}
                        </p>

                        <div className="flex items-baseline gap-2.5 mt-2.5 font-mono tabular-nums">
                          <span className="text-lg font-black text-[#0A2540]">
                            ₹{selectedRetailProduct.retailPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            ₹{Math.round(selectedRetailProduct.retailPrice * 1.24).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-sans font-bold text-emerald-700">
                            Incl. 18% GST
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <div className="font-bold text-[#0A2540] text-[11px]">
                          Technical Specifications
                        </div>
                        {Object.entries(selectedRetailProduct.specifications).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-slate-600 text-[11px] capitalize">
                            <span>{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{String(val)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                        <span className="text-xs font-bold text-[#0A2540]">Order Quantity</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                            disabled={detailQty <= 1}
                            aria-label="Decrease quantity"
                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono tabular-nums font-bold text-xs text-[#0A2540]">
                            {detailQty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDetailQty((q) =>
                                Math.min(selectedRetailProduct.stockQuantity, q + 1)
                              )
                            }
                            aria-label="Increase quantity"
                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-200 bg-white shrink-0 flex gap-2">
                      <button
                        type="button"
                        onClick={() => addToRetailCart(selectedRetailProduct, detailQty)}
                        className="flex-1 min-h-[44px] py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        Add to Cart
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addToRetailCart(selectedRetailProduct, detailQty);
                          setCurrentScreen('cart');
                        }}
                        className="flex-1 min-h-[44px] py-2.5 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        Buy Now
                      </button>
                    </div>

                    {/* Studio Lightbox Zoom Modal */}
                    {isProductZoomOpen && (
                      <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${selectedRetailProduct.name} studio zoom`}
                        onClick={() => setIsProductZoomOpen(false)}
                        className="absolute inset-0 z-40 bg-slate-950/85 p-4 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-white">
                          <span className="text-xs font-bold truncate pr-2">
                            {selectedRetailProduct.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsProductZoomOpen(false)}
                            aria-label="Close zoom preview"
                            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="my-auto rounded-2xl overflow-hidden bg-white p-2 shadow-2xl"
                        >
                          <img
                            src={selectedRetailProduct.imageUrl}
                            alt={selectedRetailProduct.name}
                            className="w-full h-72 object-contain rounded-xl bg-slate-50"
                          />
                        </div>
                        <p className="text-center text-[11px] text-slate-300">
                          Tap outside or press Esc to close studio view
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= SCREEN 8: SHOPPING CART SCREEN ================= */}
                {currentScreen === 'cart' && (
                  <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('catalog')}
                          aria-label="Back to Catalog"
                          className="min-w-[38px] min-h-[38px] rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4 text-[#0A2540]" />
                        </button>
                        <h2 className="text-base font-extrabold text-[#0A2540]">Shopping Cart</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-teal-700 font-mono tabular-nums">
                          {cartCount} {cartCount === 1 ? 'Unit' : 'Units'}
                        </span>
                        {retailCart.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setRetailCart([])}
                            className="text-[11px] font-semibold text-slate-500 hover:text-red-600 px-1.5 py-1 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {retailCart.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-extrabold text-[#0A2540]">Your Cart is Empty</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-[230px] leading-relaxed">
                          Add Califnco RO purifiers, dispensers, or replacement filter kits to calculate checkout totals.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('catalog')}
                          className="mt-4 min-h-[44px] px-5 py-2.5 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Browse Water Catalog
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 pb-6">
                          {retailCart.map((entry) => (
                            <div
                              key={entry.product.id}
                              className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2.5"
                            >
                              <div className="flex gap-3 items-start">
                                <ProductStudioImage
                                  src={entry.product.imageUrl}
                                  alt={entry.product.name}
                                  className="w-14 h-14 rounded-xl"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-xs text-[#0A2540] leading-snug line-clamp-2">
                                    {entry.product.name}
                                  </h4>
                                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                    ₹{entry.product.retailPrice.toLocaleString('en-IN')} / unit
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFromRetailCart(entry.product.id)}
                                  aria-label={`Remove ${entry.product.name}`}
                                  className="min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateRetailCartQty(entry.product.id, -1)}
                                    aria-label="Decrease item quantity"
                                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-7 text-center font-mono tabular-nums font-bold text-xs text-[#0A2540]">
                                    {entry.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateRetailCartQty(entry.product.id, 1)}
                                    aria-label="Increase item quantity"
                                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-xs font-black text-[#0A2540] font-mono tabular-nums">
                                  ₹{(entry.product.retailPrice * entry.quantity).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          ))}

                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 mt-2">
                            <div className="flex justify-between text-slate-600">
                              <span>Subtotal ({cartCount} units)</span>
                              <span className="font-mono tabular-nums font-semibold text-slate-900">
                                ₹{retailSubtotal.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Delivery &amp; Standard Handling</span>
                              <span
                                className={`font-mono tabular-nums font-bold ${
                                  retailDeliveryFee === 0 ? 'text-emerald-700' : 'text-slate-900'
                                }`}
                              >
                                {retailDeliveryFee === 0 ? 'FREE' : `₹${retailDeliveryFee}`}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>Included GST (18%)</span>
                              <span className="font-mono tabular-nums">
                                ₹{retailIncludedGst.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex justify-between font-black text-sm text-[#0A2540] pt-2 border-t border-slate-100">
                              <span>Total Payable</span>
                              <span className="font-mono tabular-nums">
                                ₹{retailGrandTotal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCurrentScreen('checkout')}
                            className="w-full min-h-[44px] py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer font-sans"
                          >
                            Proceed to Checkout (₹{retailGrandTotal.toLocaleString('en-IN')})
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ================= SCREEN 9: CHECKOUT SCREEN ================= */}
                {currentScreen === 'checkout' && (
                  <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('cart')}
                        aria-label="Back to Cart"
                        className="min-w-[40px] min-h-[40px] rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <h2 className="text-base font-extrabold text-[#0A2540]">Checkout</h2>
                      <div className="w-8" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-6">
                      {/* Destination Address */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-[#0A2540]">Delivery Address</div>
                          <button
                            type="button"
                            onClick={() => {
                              setReturnScreenAfterLocationSave('checkout');
                              setCurrentScreen('delivery_location');
                            }}
                            className="min-h-[34px] px-2 text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                          >
                            Change Location
                          </button>
                        </div>
                        <p className="text-slate-800 font-semibold">
                          {defaultDeliveryAddress.recipientName} ·{' '}
                          <span className="font-mono tabular-nums">{defaultDeliveryAddress.phone}</span>
                        </p>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          {defaultDeliveryAddress.streetAddress}, {defaultDeliveryAddress.city},{' '}
                          <span className="font-mono tabular-nums">{defaultDeliveryAddress.postalCode}</span>
                        </p>
                      </div>

                      {/* Order Summary */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                        <div className="font-bold text-[#0A2540]">Order Summary ({cartCount} units)</div>
                        {retailCart.map((c) => (
                          <div key={c.product.id} className="flex justify-between text-[11px] text-slate-600 gap-2">
                            <span className="truncate">
                              {c.quantity}× {c.product.name}
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                              ₹{(c.product.retailPrice * c.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-slate-100 flex justify-between font-extrabold text-[#0A2540]">
                          <span>Total Payable</span>
                          <span className="font-mono tabular-nums">
                            ₹{retailGrandTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
                        <div className="font-bold text-[#0A2540]">Payment Method</div>

                        <button
                          type="button"
                          onClick={() => setPaymentChoice('cod')}
                          className={`w-full min-h-[52px] p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                            paymentChoice === 'cod'
                              ? 'border-teal-600 bg-teal-50/50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Banknote className="w-4 h-4 text-teal-700 shrink-0" />
                            <div>
                              <div className="font-bold text-[#0A2540]">Cash on Delivery (COD)</div>
                              <div className="text-[10.5px] text-slate-500">
                                Pay upon doorstep delivery · Saves live to Firestore when signed in
                              </div>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentChoice('razorpay')}
                          className={`w-full min-h-[52px] p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                            paymentChoice === 'razorpay'
                              ? 'border-teal-600 bg-teal-50/50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <CreditCard className="w-4 h-4 text-slate-700 shrink-0" />
                            <div>
                              <div className="font-bold text-[#0A2540]">Razorpay (Client Test Mode)</div>
                              <div className="text-[10.5px] text-slate-500">
                                UI simulation only · Requires server HMAC webhook for live capture
                              </div>
                            </div>
                          </div>
                          <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                            UNVERIFIED
                          </span>
                        </button>

                        {paymentChoice === 'razorpay' && (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10.5px] text-amber-950 leading-relaxed">
                            <strong>Payment Verification Notice:</strong> No server-side{' '}
                            <code>RAZORPAY_KEY_SECRET</code> webhook is configured in this preview. Orders placed in test mode are recorded as <strong>Payment Unverified</strong>.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                      <button
                        type="button"
                        disabled={isPlacingRetailOrder || retailCart.length === 0}
                        onClick={handlePlaceRetailOrder}
                        className="w-full min-h-[44px] py-3 bg-[#0A2540] hover:bg-[#061B2E] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        {isPlacingRetailOrder
                          ? 'Submitting Order...'
                          : paymentChoice === 'cod'
                          ? `Place COD Order (₹${retailGrandTotal.toLocaleString('en-IN')})`
                          : `Record Test Order (₹${retailGrandTotal.toLocaleString('en-IN')})`}
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 10: ORDER CONFIRMATION SCREEN ================= */}
                {currentScreen === 'order_confirmation' && (
                  <div className="flex-1 flex flex-col bg-white overflow-y-auto p-6 text-center justify-between">
                    <div className="pt-2 flex flex-col items-center">
                      <div
                        className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 ${
                          selectedOrder.paymentStatus === 'verified'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                          selectedOrder.paymentStatus === 'verified'
                            ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                            : 'text-amber-900 bg-amber-50 border border-amber-200'
                        }`}
                      >
                        {selectedOrder.paymentStatus === 'verified'
                          ? 'Payment Verified'
                          : selectedOrder.paymentMethod === 'cod'
                          ? 'COD — Payment Due on Delivery'
                          : 'Test Checkout — Payment Unverified'}
                      </span>
                      <h2 className="text-xl font-black text-[#0A2540] mt-2">
                        Order Request Recorded
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                        Order Ref: <strong>#{selectedOrder.orderNumber}</strong>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-left space-y-2 my-4">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Order Total:</span>
                        <span className="font-bold text-[#0A2540] font-mono tabular-nums">
                          ₹{selectedOrder.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Payment Status:</span>
                        <span className="font-bold text-slate-900">
                          {selectedOrder.paymentStatus === 'verified'
                            ? 'Settled & Verified'
                            : selectedOrder.paymentMethod === 'cod'
                            ? 'Uncollected (Cash on Delivery)'
                            : 'Pending Server Gateway Verification'}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Destination:</span>
                        <span className="font-bold text-slate-800 font-mono tabular-nums">
                          {selectedOrder.deliveryAddress.city} {selectedOrder.deliveryAddress.pincode}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-600 pt-2 border-t border-slate-200 leading-relaxed">
                        {selectedOrder.paymentMethod === 'razorpay' &&
                        selectedOrder.paymentStatus !== 'verified'
                          ? 'Note: Client-side Razorpay test mode does not verify payment capture. Configure a backend Razorpay Order + HMAC-SHA256 webhook before fulfilling paid orders.'
                          : selectedOrder.estimatedDelivery}
                      </div>
                    </div>

                    <div className="space-y-2 pb-1">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_detail_view')}
                        className="w-full min-h-[44px] py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
                      >
                        View Order Details &amp; Tracking
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_history')}
                        className="w-full min-h-[44px] py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Go to Order History
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 11: ORDER HISTORY SCREEN ================= */}
                {currentScreen === 'order_history' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
                      <h2 className="text-base font-extrabold text-[#0A2540]">Order History</h2>
                      <span className="text-xs font-bold text-teal-700 font-mono tabular-nums">
                        {orders.length} Orders
                      </span>
                    </div>

                    {/* Orders List */}
                    {isOrdersLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <ShoppingBag className="w-12 h-12 text-slate-300 mb-2" />
                        <h3 className="font-bold text-sm text-slate-700">No Orders Placed Yet</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          You haven&apos;t purchased any water purifiers or filter cartridges yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('catalog')}
                          className="mt-3 min-h-[44px] px-4 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Explore Catalog
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-16">
                        {orders.map((ord) => (
                          <div
                            key={ord.id}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-extrabold text-xs text-[#0A2540] font-mono tabular-nums">
                                #{ord.orderNumber}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${
                                  ord.orderStatus === 'delivered'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-teal-50 text-teal-800 border border-teal-200'
                                }`}
                              >
                                {ord.orderStatus}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500">{ord.createdAt}</p>

                            <div className="my-2 py-2 border-y border-slate-100 text-xs">
                              <div className="flex items-center gap-2.5">
                                <ProductStudioImage
                                  src={ord.items[0]?.imageUrl || IMG_PURIFIER}
                                  alt={ord.items[0]?.productName || 'Order item'}
                                  className="w-11 h-11 rounded-lg"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-[#0A2540] truncate">
                                    {ord.items[0]?.productName}
                                  </h4>
                                  <p className="text-[10.5px] text-slate-500 tabular-nums">
                                    {ord.items.length > 1
                                      ? `+${ord.items.length - 1} other item(s)`
                                      : `Qty: ${ord.items[0]?.quantity}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-[#0A2540] font-mono tabular-nums">
                                    ₹{ord.totalAmount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 gap-2">
                              <span
                                className={`text-[10.5px] font-semibold flex items-center gap-1 ${
                                  ord.paymentStatus === 'verified'
                                    ? 'text-emerald-700'
                                    : 'text-amber-800'
                                }`}
                              >
                                {ord.paymentStatus === 'verified' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                                <span>
                                  {ord.paymentStatus === 'verified'
                                    ? 'Paid (Verified)'
                                    : ord.paymentMethod === 'cod'
                                    ? 'COD Pending'
                                    : 'Gateway Unverified'}
                                </span>
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setCurrentScreen('order_detail_view');
                                }}
                                className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>View Details</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Unified 5-Tab Customer Bottom Navigation */}
                    <div className="h-14 bg-white border-t border-slate-200 px-3 flex items-center justify-between text-slate-500 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('home')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <Home className="w-4 h-4" />
                        <span className="text-[10px]">Home</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('catalog')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <Grid className="w-4 h-4" />
                        <span className="text-[10px]">Catalog</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('cart')}
                        className="relative min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Cart</span>
                        {cartCount > 0 && (
                          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-teal-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_history')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[#0A2540] font-bold cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4 text-teal-700" />
                        <span className="text-[10px]">Orders</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('profile')}
                        className="min-w-[52px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-[10px]">Profile</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 12: ORDER DETAIL VIEW SCREEN ================= */}
                {currentScreen === 'order_detail_view' && selectedOrder && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_history')}
                        aria-label="Back to Order History"
                        className="min-w-[40px] min-h-[40px] rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                      >
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <h2 className="text-sm font-extrabold text-[#0A2540] font-mono tabular-nums">
                        #{selectedOrder.orderNumber}
                      </h2>
                      <div className="w-8" />
                    </div>

                    {/* Scrollable Order Inspection */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
                      {/* Fulfilment & Payment Verification Card */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Fulfilment Status</span>
                          <span className="font-extrabold uppercase text-[#0A2540]">
                            {selectedOrder.orderStatus}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Payment Verification</span>
                          <span
                            className={`font-bold ${
                              selectedOrder.paymentStatus === 'verified'
                                ? 'text-emerald-700'
                                : 'text-amber-800'
                            }`}
                          >
                            {selectedOrder.paymentStatus === 'verified'
                              ? 'Verified (Razorpay)'
                              : selectedOrder.paymentMethod === 'cod'
                              ? 'COD — Uncollected'
                              : 'Unverified Test Checkout'}
                          </span>
                        </div>
                        {selectedOrder.estimatedDelivery && (
                          <div className="flex items-center gap-1.5 text-xs text-teal-800 font-semibold pt-1.5 border-t border-slate-100">
                            <Truck className="w-4 h-4 text-teal-700 shrink-0" />
                            <span>{selectedOrder.estimatedDelivery}</span>
                          </div>
                        )}
                      </div>

                      {/* Timeline Milestones */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3">
                          Fulfilment Milestones
                        </h3>
                        <div className="space-y-3">
                          {selectedOrder.timeline.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-xs">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                    step.completed
                                      ? 'bg-teal-600 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {step.completed ? '✓' : idx + 1}
                                </div>
                                {idx < selectedOrder.timeline.length - 1 && (
                                  <div
                                    className={`w-0.5 h-6 mt-1 ${
                                      step.completed ? 'bg-teal-600' : 'bg-slate-200'
                                    }`}
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                <p
                                  className={`font-semibold ${
                                    step.completed ? 'text-[#0A2540]' : 'text-slate-400'
                                  }`}
                                >
                                  {step.status}
                                </p>
                                <p className="text-[10px] text-slate-400">{step.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Purchased Products */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2.5">
                          Purchased Purifiers &amp; Consumables
                        </h3>
                        <div className="space-y-2 text-xs divide-y divide-slate-100">
                          {selectedOrder.items.map((item) => (
                            <div key={item.productId} className="pt-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ProductStudioImage
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-10 h-10 rounded-lg"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-[#0A2540] truncate">
                                    {item.productName}
                                  </p>
                                  <p className="text-[10.5px] text-slate-500 font-mono tabular-nums">
                                    Qty: {item.quantity} × ₹{item.unitPrice.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold text-[#0A2540] font-mono tabular-nums shrink-0">
                                ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-slate-100 mt-3 pt-2 flex justify-between font-extrabold text-xs text-[#0A2540]">
                          <span>Grand Total</span>
                          <span className="font-mono tabular-nums">
                            ₹{selectedOrder.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                          Destination Address
                        </h3>
                        <p className="font-bold text-[#0A2540]">{selectedOrder.deliveryAddress.name}</p>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                          {selectedOrder.deliveryAddress.address}, {selectedOrder.deliveryAddress.city} -{' '}
                          <span className="font-mono tabular-nums">{selectedOrder.deliveryAddress.pincode}</span>
                        </p>
                        <p className="text-slate-500 text-[11px] mt-1 font-mono tabular-nums">
                          Phone: {selectedOrder.deliveryAddress.phone}
                        </p>
                      </div>

                      {/* Installation Support CTA */}
                      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs">
                        <div className="flex items-center gap-2 text-teal-800 font-bold mb-1">
                          <Wrench className="w-4 h-4 text-teal-600" />
                          <span>Installation & Warranty Support</span>
                        </div>
                        <p className="text-[11px] text-[#0A2540] leading-relaxed mb-3">
                          All Califnco RO systems include free certified technician installation and a 1-year membrane warranty.
                        </p>
                        <button
                          onClick={() => {
                            const primaryItem = selectedOrder.items[0];
                            setServiceCategory('Installation');
                            if (primaryItem) {
                              setServiceProductId(primaryItem.productId);
                              setServiceProductModel(primaryItem.productName);
                            }
                            setServiceLinkedOrderNumber(selectedOrder.orderNumber);
                            setSelectedServiceAddressId('custom');
                            setServiceStreetAddress(selectedOrder.deliveryAddress.address);
                            setServiceCityState(`${selectedOrder.deliveryAddress.city}, Maharashtra`);
                            setServicePostalCode(selectedOrder.deliveryAddress.pincode);
                            setServiceContactName(selectedOrder.deliveryAddress.name);
                            setServiceContactPhone(selectedOrder.deliveryAddress.phone);
                            setServiceDescription(
                              `Certified installation requested for order #${selectedOrder.orderNumber}.`
                            );
                            setCurrentScreen('service_booking');
                          }}
                          className="w-full py-2.5 min-h-[44px] bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Request Installation Visit
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 13: CUSTOMER PROFILE SCREEN ================= */}
                {currentScreen === 'profile' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <h2 className="text-base font-extrabold text-[#0A2540]">My Profile</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        Residential ID
                      </span>
                    </div>

                    {/* Scrollable Profile Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-16">
                      {/* Profile Card */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-2xs">
                        <div className="relative inline-block mx-auto mb-2.5">
                          <div className="w-16 h-16 rounded-full bg-[#0A2540] text-white flex items-center justify-center font-bold text-xl shadow-sm border-2 border-white">
                            {profile.fullName.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center border-2 border-white">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>

                        <h3 className="font-extrabold text-sm text-[#0A2540]">{profile.fullName}</h3>
                        <p className="text-[11px] text-slate-500">{profile.email}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{profile.phone}</p>

                        <div className="mt-2.5 flex justify-center">
                          <span className="text-[10px] font-extrabold tracking-wide px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase">
                            Verified Customer
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setEditName(profile.fullName);
                            setEditPhone(profile.phone);
                            setIsEditingProfile(true);
                          }}
                          className="mt-3.5 w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#0A2540] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Edit Profile</span>
                        </button>
                      </div>

                      {/* Core Shortcuts */}
                      <div className="space-y-2">
                        {/* Saved Addresses Shortcut */}
                        <div
                          onClick={() => setCurrentScreen('address_management')}
                          className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#0A2540]">Saved Delivery Addresses</h4>
                              <p className="text-[10.5px] text-slate-400">
                                {addresses.length} addresses ({addresses.find((a) => a.isDefault)?.city || 'Mumbai'})
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>

                        {/* Order History Shortcut */}
                        <div
                          onClick={() => setCurrentScreen('order_history')}
                          className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#0A2540]">My Order History</h4>
                              <p className="text-[10.5px] text-slate-400">{orders.length} orders placed</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>

                        {/* Notifications Inbox Shortcut -> Opens Screen 25 */}
                        <div
                          onClick={() => setCurrentScreen('notifications')}
                          className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                              <Bell className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#0A2540]">
                                Notifications &amp; Order Alerts
                              </h4>
                              <p className="text-[10.5px] text-slate-400">
                                {unreadNotificationCount} unread · FCM &amp; trusted order updates
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>

                        {/* Delivery Location Map Shortcut -> Opens Screen 26 */}
                        <div
                          onClick={() => {
                            setReturnScreenAfterLocationSave('address_management');
                            setCurrentScreen('delivery_location');
                          }}
                          className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#0A2540] flex items-center justify-center">
                              <Navigation className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#0A2540]">
                                Set Delivery Location (OpenStreetMap)
                              </h4>
                              <p className="text-[10.5px] text-slate-400">
                                Pin selector &amp; manual postal fallback
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>

                        {/* Service Bookings Shortcut -> Opens Screen 23 */}
                        <div
                          onClick={() => setCurrentScreen('service_booking')}
                          className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#0A2540]">Service Bookings &amp; Warranty</h4>
                              <p className="text-[10.5px] text-slate-400">
                                Book installation, maintenance, or repair
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      {/* Notification Preferences */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
                          <Bell className="w-3.5 h-3.5 text-teal-600" />
                          <span>Notification Preferences</span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <div>
                            <div className="font-semibold text-slate-800 text-[11px]">Order & Dispatch Updates</div>
                            <div className="text-[10px] text-slate-400">SMS and push tracking alerts</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.notifications.orderUpdates}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                notifications: { ...profile.notifications, orderUpdates: e.target.checked },
                              })
                            }
                            className="w-4 h-4 accent-teal-600 cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <div>
                            <div className="font-semibold text-slate-800 text-[11px]">Filter Replacement Reminders</div>
                            <div className="text-[10px] text-slate-400">6-month cartridge change alerts</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.notifications.filterReplacementReminders}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                notifications: {
                                  ...profile.notifications,
                                  filterReplacementReminders: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 accent-teal-600 cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center justify-between py-1">
                          <div>
                            <div className="font-semibold text-slate-800 text-[11px]">Technician Service Visits</div>
                            <div className="text-[10px] text-slate-400">Annual maintenance reminder alerts</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={profile.notifications.technicianVisits}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                notifications: { ...profile.notifications, technicianVisits: e.target.checked },
                              })
                            }
                            className="w-4 h-4 accent-teal-600 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Logout Button */}
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>

                    {/* Bottom Nav */}
                    <div className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-slate-500 shrink-0">
                      <button
                        onClick={() => setCurrentScreen('home')}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <Home className="w-4 h-4" />
                        <span className="text-[10px]">Home</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('catalog')}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <Grid className="w-4 h-4" />
                        <span className="text-[10px]">Catalog</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('cart')}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Cart</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('order_history')}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px]">Orders</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('profile')}
                        className="flex flex-col items-center gap-0.5 text-[#0A2540] font-bold"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-[10px]">Profile</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 14: ADDRESS MANAGEMENT SCREEN ================= */}
                {currentScreen === 'address_management' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <button
                        onClick={() => setCurrentScreen('profile')}
                        className="p-1 rounded-full text-slate-600 hover:bg-slate-100"
                      >
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <h2 className="text-base font-extrabold text-[#0A2540]">Saved Addresses</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setReturnScreenAfterLocationSave('address_management');
                          setCurrentScreen('delivery_location');
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                      >
                        + Map / Add
                      </button>
                    </div>

                    {/* Address List */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-20">
                      {addresses.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-12">
                          <MapPin className="w-12 h-12 text-slate-300 mb-2" />
                          <h3 className="font-bold text-sm text-slate-700">No Saved Addresses</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Add a delivery address for pure water equipment and filter installations.
                          </p>
                          <button
                            onClick={() => {
                              setEditingAddressId(null);
                              setIsAddressModalOpen(true);
                            }}
                            className="mt-4 px-4 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-semibold"
                          >
                            Add Address
                          </button>
                        </div>
                      ) : (
                        addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`bg-white p-3.5 rounded-2xl border transition-all shadow-2xs ${
                              addr.isDefault ? 'border-teal-500 ring-1 ring-teal-500/20' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-slate-100 text-[#0A2540]">
                                  {addr.label}
                                </span>
                                {addr.isDefault && (
                                  <span className="px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                                    DEFAULT
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingAddressId(addr.id);
                                    setAddressForm({
                                      recipientName: addr.recipientName,
                                      phone: addr.phone,
                                      streetAddress: addr.streetAddress,
                                      city: addr.city,
                                      state: addr.state,
                                      postalCode: addr.postalCode,
                                      deliveryInstructions: addr.deliveryInstructions || '',
                                      label: addr.label,
                                      isDefault: addr.isDefault,
                                    });
                                    setIsAddressModalOpen(true);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (addr.isDefault && addresses.length > 1) {
                                      showToast('Please set another address as default before deleting this address.');
                                      return;
                                    }
                                    setAddresses(addresses.filter((a) => a.id !== addr.id));
                                    showToast('Address deleted.');
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-bold text-xs text-[#0A2540]">{addr.recipientName}</h4>
                            <p className="text-[11px] text-slate-500">{addr.phone}</p>
                            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                              {addr.streetAddress}, {addr.city}, {addr.state} - {addr.postalCode}
                            </p>

                            {addr.deliveryInstructions && (
                              <div className="mt-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10.5px] text-slate-500 flex items-start gap-1.5">
                                <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                                <span>Note: {addr.deliveryInstructions}</span>
                              </div>
                            )}

                            {!addr.isDefault && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 text-right">
                                <button
                                  onClick={() => {
                                    setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === addr.id })));
                                    showToast('Default address updated.');
                                  }}
                                  className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
                                >
                                  Set as Default Delivery Address
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Bottom CTA -> Opens Screen 26 Delivery Location */}
                    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setReturnScreenAfterLocationSave('address_management');
                          setCurrentScreen('delivery_location');
                        }}
                        className="w-full py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Add Delivery Location (Map or Manual)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 15: DEALER HOME SCREEN ================= */}
                {currentScreen === 'dealer_home' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-extrabold text-[#0A2540]">Dealer Partner Hub</h2>
                          <p className="text-[10px] text-slate-400 font-mono">{dealerProfile.dealerId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const next = dealerProfile.approvalStatus === 'approved' ? 'pending' : (dealerProfile.approvalStatus === 'pending' ? 'rejected' : 'approved');
                            setDealerProfile({ ...dealerProfile, approvalStatus: next });
                            showToast(`Dealer status changed to: ${next.toUpperCase()}`);
                          }}
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase transition-colors ${
                            dealerProfile.approvalStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : dealerProfile.approvalStatus === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-red-50 text-red-700 border-red-300'
                          }`}
                          title="Click to cycle status: Approved -> Pending -> Rejected"
                        >
                          {dealerProfile.approvalStatus}
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Dealer Feed */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-16">
                      {/* Business Identity Card */}
                      <div className="bg-gradient-to-br from-[#0A2540] to-[#0f3b66] text-white p-4 rounded-2xl shadow-sm relative overflow-hidden">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white/15 text-teal-200">
                              {dealerProfile.wholesaleTier}
                            </span>
                            <h3 className="font-extrabold text-base mt-2 text-white leading-tight">
                              {dealerProfile.businessName}
                            </h3>
                            <p className="text-xs text-slate-300 mt-0.5">
                              Authorized Contact: <span className="font-semibold text-white">{dealerProfile.contactPerson}</span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3.5 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                            <span className="text-[9.5px] text-slate-400 block">Available Credit</span>
                            <span className="font-black text-sm text-teal-300">₹{dealerProfile.availableCredit.toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">of ₹{dealerProfile.creditLimit.toLocaleString()}</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                            <span className="text-[9.5px] text-slate-400 block">Verified GSTIN</span>
                            <span className="font-mono text-[11px] font-bold text-white block mt-0.5 truncate">{dealerProfile.gstin}</span>
                            <span className="text-[9px] text-emerald-400 font-semibold block mt-0.5">Active & Compliant</span>
                          </div>
                        </div>
                      </div>

                      {/* Warning Notice if Approval is Pending or Rejected */}
                      {dealerProfile.approvalStatus !== 'approved' && (
                        <div
                          className={`p-3.5 rounded-2xl border text-xs ${
                            dealerProfile.approvalStatus === 'pending'
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : 'bg-red-50 border-red-200 text-red-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold mb-1">
                            <AlertTriangle className={`w-4 h-4 ${dealerProfile.approvalStatus === 'pending' ? 'text-amber-600' : 'text-red-600'}`} />
                            <span>
                              {dealerProfile.approvalStatus === 'pending'
                                ? 'Application Under Administrator Review'
                                : 'Wholesale Application Rejected'}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            {dealerProfile.approvalStatus === 'pending'
                              ? 'Your GSTIN and business credentials are being verified by Califnco compliance. Wholesale catalog pricing and bulk checkout privileges are temporarily restricted.'
                              : 'Your dealer verification was rejected due to incomplete business documentation. Wholesale purchasing privileges are disabled.'}
                          </p>
                        </div>
                      )}

                      {/* Wholesale Shopping Entry Point Card */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-xs text-[#0A2540]">Wholesale Product Catalog</h4>
                            <p className="text-[10.5px] text-slate-500 truncate">
                              Order RO systems, dispensers & master cartons
                            </p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                          {dealerProfile.approvalStatus === 'approved'
                            ? 'Access authentic Califnco inventory with wholesale trade pricing (38% to 52% margin vs retail MRP).'
                            : 'Catalog pricing is locked pending administrator verification of your dealer license.'}
                        </p>
                        <button
                          onClick={() => {
                            if (dealerProfile.approvalStatus !== 'approved') {
                              showToast('Wholesale purchasing is locked until approved!');
                              return;
                            }
                            setCurrentScreen('wholesale_catalog');
                          }}
                          className={`mt-3 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs ${
                            dealerProfile.approvalStatus === 'approved'
                              ? 'bg-[#0A2540] hover:bg-[#061B2E] text-white'
                              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {dealerProfile.approvalStatus === 'approved' ? (
                            <>
                              <span>Enter Wholesale Catalog</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Wholesale Catalog Locked</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Bulk Order Shortcuts */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Quick Bulk Orders</span>
                          <span className="text-[10px] text-teal-600 font-semibold">Tier 1 MOQs</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              if (dealerProfile.approvalStatus !== 'approved') {
                                showToast('Dealer verification required.');
                                return;
                              }
                              setWholesaleCategory('Filters');
                              setCurrentScreen('wholesale_catalog');
                            }}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 text-left hover:border-slate-300 transition-all shadow-2xs"
                          >
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">MOQ 20 Units</span>
                            <h5 className="font-bold text-xs text-[#0A2540] mt-1">Filter Cartons</h5>
                            <span className="text-[10.5px] font-black text-emerald-600">52% Margin</span>
                          </button>

                          <button
                            onClick={() => {
                              if (dealerProfile.approvalStatus !== 'approved') {
                                showToast('Dealer verification required.');
                                return;
                              }
                              setWholesaleCategory('Water Purifiers');
                              setCurrentScreen('wholesale_catalog');
                            }}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 text-left hover:border-slate-300 transition-all shadow-2xs"
                          >
                            <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">MOQ 5 Units</span>
                            <h5 className="font-bold text-xs text-[#0A2540] mt-1">RO Purifiers Bulk</h5>
                            <span className="text-[10.5px] font-black text-emerald-600">38% Margin</span>
                          </button>
                        </div>
                      </div>

                      {/* Recent B2B Purchase Orders */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-2.5">
                          <div>
                            <h4 className="font-bold text-xs text-[#0A2540]">Recent Purchase Orders</h4>
                            <span className="text-[10px] text-slate-400">Past 30 Days</span>
                          </div>
                          <button
                            onClick={() => setCurrentScreen('dealer_order_history')}
                            className="text-[10.5px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
                          >
                            <span>View All (Screen 18)</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-2 text-xs">
                          {dealerOrders.map((po) => (
                            <div
                              key={po.id}
                              onClick={() => setSelectedDealerOrderForDetails(po)}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                              <div>
                                <p className="font-bold text-[#0A2540] text-[11px]">{po.poNumber}</p>
                                <p className="text-[10px] text-slate-400">{po.itemCount} units • {po.date}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-[#0A2540] text-[11px]">₹{po.totalWholesaleAmount.toLocaleString()}</p>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                    po.fulfilmentStatus === 'dispatched'
                                      ? 'bg-blue-100 text-blue-700'
                                      : po.fulfilmentStatus === 'delivered'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {po.fulfilmentStatus}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Account & Warehouse Information */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs shadow-2xs space-y-1.5">
                        <h4 className="font-bold text-xs text-[#0A2540] mb-2">Registered Warehouse & Tax Info</h4>
                        <div className="flex justify-between text-slate-500 text-[10.5px]">
                          <span>Warehouse:</span>
                          <span className="font-semibold text-slate-700 truncate max-w-[200px]">Thane West, Mumbai</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[10.5px]">
                          <span>Partner Tier:</span>
                          <span className="font-semibold text-teal-700">Tier 1 Platinum</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[10.5px]">
                          <span>Support Desk:</span>
                          <span className="font-semibold text-slate-700">+91 22 4590 8800</span>
                        </div>
                      </div>

                      {/* Business Notices */}
                      <div className="space-y-2">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[10.5px] text-emerald-900 flex items-start gap-2">
                          <Percent className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Q4 High-TDS Seasonal Bulk Incentive:</span> Extra 5% credit rebate on 150 GPD pumps & 80 GPD membranes for cumulative monthly POs exceeding ₹1,50,000.
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-[10.5px] text-blue-900 flex items-start gap-2">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Mandatory GST E-Invoicing Active:</span> All wholesale orders now generate certified IRN & QR codes for seamless GST input credit reconciliation.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dealer Bottom Navigation */}
                    <div className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-slate-500 shrink-0">
                      <button onClick={() => setCurrentScreen('dealer_home')} className="flex flex-col items-center gap-0.5 text-[#0A2540] font-bold">
                        <Store className="w-4 h-4 text-teal-600" />
                        <span className="text-[10px]">Hub</span>
                      </button>
                      <button
                        onClick={() => {
                          if (dealerProfile.approvalStatus !== 'approved') {
                            showToast('Wholesale catalog requires approved dealer status.');
                            return;
                          }
                          setCurrentScreen('wholesale_catalog');
                        }}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <Grid className="w-4 h-4" />
                        <span className="text-[10px]">Wholesale</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('bulk_order_cart')}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600 relative"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Bulk Cart</span>
                        {Object.values(wholesaleCart).reduce((a, b) => a + b, 0) > 0 && (
                          <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-teal-500" />
                        )}
                      </button>
                      <button
                        onClick={() => setCurrentScreen('dealer_order_history')}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px]">PO History</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('profile')}
                        className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-[10px]">Profile</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 16: WHOLESALE CATALOG SCREEN ================= */}
                {currentScreen === 'wholesale_catalog' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <button
                        onClick={() => setCurrentScreen('dealer_home')}
                        className="p-1 rounded-full text-slate-600 hover:bg-slate-100"
                      >
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <div>
                        <h2 className="text-sm font-extrabold text-[#0A2540] text-center">Wholesale B2B Catalog</h2>
                        <p className="text-[10px] text-teal-600 font-bold text-center">Tier 1 Platinum Pricing</p>
                      </div>
                      <button
                        onClick={() => setCurrentScreen('bulk_order_cart')}
                        className="relative p-1.5 text-slate-700 hover:bg-slate-100 rounded-xl"
                        title="Bulk Order Cart"
                      >
                        <ShoppingCart className="w-5 h-5 text-[#0A2540]" />
                        {Object.values(wholesaleCart).reduce((a, b) => a + b, 0) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                            {Object.values(wholesaleCart).reduce((a, b) => a + b, 0)}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Access Guard */}
                    {dealerProfile.approvalStatus !== 'approved' ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
                          <Lock className="w-8 h-8" />
                        </div>
                        <h3 className="font-extrabold text-base text-[#0A2540]">Wholesale Pricing Locked</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                          Wholesale pricing and bulk ordering require verified dealer credentials. Your account is currently {dealerProfile.approvalStatus.toUpperCase()}.
                        </p>
                        <button
                          onClick={() => setCurrentScreen('dealer_home')}
                          className="mt-4 px-4 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-bold shadow-md"
                        >
                          Return to Dealer Hub
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Search and Category Filters */}
                        <div className="bg-white p-3 border-b border-slate-200 shrink-0 space-y-2">
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search purifiers, filters, pumps..."
                              value={wholesaleSearch}
                              onChange={(e) => setWholesaleSearch(e.target.value)}
                              className="w-full bg-transparent outline-none text-slate-800 text-xs"
                            />
                            {wholesaleSearch && (
                              <button onClick={() => setWholesaleSearch('')} className="text-slate-400">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Category Chips */}
                          <div className="flex gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
                            {['All', 'Water Purifiers', 'Dispensers', 'Pumps', 'Filters', 'Spare Parts'].map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setWholesaleCategory(cat)}
                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold whitespace-nowrap transition-colors ${
                                  wholesaleCategory === cat
                                    ? 'bg-[#0A2540] text-white font-bold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Product Cards Feed */}
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-24">
                          {WHOLESALE_CATALOG_PRODUCTS.filter((prod) => {
                            const matchCategory = wholesaleCategory === 'All' || prod.category === wholesaleCategory;
                            const matchSearch =
                              !wholesaleSearch ||
                              prod.name.toLowerCase().includes(wholesaleSearch.toLowerCase()) ||
                              prod.description.toLowerCase().includes(wholesaleSearch.toLowerCase());
                            return matchCategory && matchSearch;
                          }).map((prod) => {
                            const currentQty = wholesaleItemQuantities[prod.id] ?? prod.moq;
                            const marginPercent = Math.round(((prod.retailPrice - prod.dealerPrice) / prod.retailPrice) * 100);

                            return (
                              <div
                                key={prod.id}
                                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                              >
                                <div className="flex gap-3">
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="w-18 h-18 rounded-xl object-cover bg-slate-100 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.2 rounded bg-slate-100">
                                        {prod.category}
                                      </span>
                                      <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.2 rounded">
                                        MOQ: {prod.moq}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-xs text-[#0A2540] truncate mt-0.5">{prod.name}</h4>

                                    {/* Wholesale Price vs Retail MRP */}
                                    <div className="flex items-baseline gap-1.5 mt-1">
                                      <span className="text-sm font-black text-[#0A2540]">
                                        ₹{prod.dealerPrice.toLocaleString()}
                                      </span>
                                      <span className="text-[10px] text-slate-400 line-through">
                                        ₹{prod.retailPrice.toLocaleString()}
                                      </span>
                                      <span className="text-[9.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                                        {marginPercent}% MARGIN
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Stock & MOQ Indicators */}
                                <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1 border-t border-slate-100">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Stock: {prod.stockQuantity} units</span>
                                  </div>
                                  <span className="font-semibold text-teal-700">Min Order: {prod.moq} Units</span>
                                </div>

                                {/* Quantity Stepper & Add to Bulk Order CTA */}
                                <div className="flex items-center gap-2 pt-1">
                                  {/* MOQ-Guarded Stepper */}
                                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shrink-0">
                                    <button
                                      onClick={() => {
                                        if (currentQty > prod.moq) {
                                          setWholesaleItemQuantities({
                                            ...wholesaleItemQuantities,
                                            [prod.id]: currentQty - 1,
                                          });
                                        } else {
                                          showToast(`Cannot go below MOQ of ${prod.moq} units.`);
                                        }
                                      }}
                                      className={`px-2.5 py-1 text-xs font-bold ${
                                        currentQty <= prod.moq ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-200'
                                      }`}
                                    >
                                      -
                                    </button>
                                    <span className="px-2 font-bold text-xs text-[#0A2540] min-w-[28px] text-center">
                                      {currentQty}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setWholesaleItemQuantities({
                                          ...wholesaleItemQuantities,
                                          [prod.id]: currentQty + 1,
                                        });
                                      }}
                                      className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Add to Bulk Order CTA */}
                                  <button
                                    onClick={() => {
                                      setWholesaleCart({
                                        ...wholesaleCart,
                                        [prod.id]: (wholesaleCart[prod.id] ?? 0) + currentQty,
                                      });
                                      showToast(`Added ${currentQty}x ${prod.name} to bulk order!`);
                                    }}
                                    className="flex-1 py-2 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add to Bulk (₹{(prod.dealerPrice * currentQty).toLocaleString()})</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Floating Bulk Order Bar */}
                        {Object.values(wholesaleCart).reduce((a, b) => a + b, 0) > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-slate-200 shadow-xl flex items-center justify-between z-30">
                            <div>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {Object.values(wholesaleCart).reduce((a, b) => a + b, 0)} Units in Bulk Order
                              </p>
                              <p className="text-sm font-black text-[#0A2540]">
                                ₹
                                {Object.entries(wholesaleCart)
                                  .reduce((sum, [id, qty]) => {
                                    const p = WHOLESALE_CATALOG_PRODUCTS.find((prod) => prod.id === id);
                                    return sum + (p ? p.dealerPrice * qty : 0);
                                  }, 0)
                                  .toLocaleString()}
                              </p>
                            </div>
                            <button
                              onClick={() => setCurrentScreen('bulk_order_cart')}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Review Bulk PO (Screen 17)</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ================= SCREEN 17: BULK ORDER CART ================= */}
                {currentScreen === 'bulk_order_cart' && (() => {
                  const cartEntries = Object.entries(wholesaleCart).filter(([_, qty]) => qty > 0);
                  const items = cartEntries
                    .map(([id, qty]) => {
                      const prod = WHOLESALE_CATALOG_PRODUCTS.find((p) => p.id === id);
                      if (!prod) return null;
                      return {
                        prod,
                        quantity: qty,
                        lineTotal: prod.dealerPrice * qty,
                        moqViolated: qty < prod.moq,
                        stockViolated: qty > prod.stockQuantity,
                      };
                    })
                    .filter((item): item is NonNullable<typeof item> => item !== null);

                  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
                  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
                  const deliveryCharges = items.length === 0 ? 0 : subtotal >= 50000 ? 0 : 1200;
                  const totalAmount = subtotal + deliveryCharges;
                  const gstItc = (subtotal * 0.18) / 1.18;
                  const hasMoqViolation = items.some((i) => i.moqViolated);
                  const hasStockViolation = items.some((i) => i.stockViolated);
                  const isApproved = dealerProfile.approvalStatus === 'approved';
                  const canSubmit = isApproved && items.length > 0 && !hasMoqViolation && !hasStockViolation && !isSubmittingPO;

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                      {/* Top Bar */}
                      <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <button
                          onClick={() => setCurrentScreen('wholesale_catalog')}
                          className="p-1 rounded-full text-slate-600 hover:bg-slate-100"
                        >
                          <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                        </button>
                        <div className="text-center">
                          <h2 className="text-sm font-extrabold text-[#0A2540]">Bulk Order Cart</h2>
                          <p className="text-[10px] text-teal-600 font-bold">Wholesale Commercial Procurement</p>
                        </div>
                        {items.length > 0 ? (
                          <button
                            onClick={() => {
                              setWholesaleCart({});
                              showToast('Bulk order cart cleared.');
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Clear Bulk Cart"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-7" />
                        )}
                      </div>

                      {/* Approval Warning Banner */}
                      {!isApproved && (
                        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2.5 shrink-0">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="text-[11px] text-amber-800 leading-tight">
                            <span className="font-bold">Dealer Account {dealerProfile.approvalStatus.toUpperCase()}:</span> Bulk PO submission is locked until account verification is approved by Califnco Admin.
                          </div>
                        </div>
                      )}

                      {/* Content Area */}
                      {items.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                            <ShoppingCart className="w-8 h-8" />
                          </div>
                          <h3 className="font-extrabold text-base text-[#0A2540]">Bulk Cart is Empty</h3>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                            No wholesale products added. Explore our wholesale catalog to procure purifiers, dispensers, filters, and spare parts.
                          </p>
                          <button
                            onClick={() => setCurrentScreen('wholesale_catalog')}
                            className="mt-4 px-5 py-2.5 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                          >
                            <Store className="w-4 h-4" />
                            <span>Browse Wholesale Catalog</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Cart Items List */}
                          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-32">
                            {items.map(({ prod, quantity, lineTotal, moqViolated, stockViolated }) => (
                              <div
                                key={prod.id}
                                className={`bg-white p-3 rounded-2xl border shadow-2xs space-y-2.5 transition-all ${
                                  moqViolated || stockViolated ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                                }`}
                              >
                                <div className="flex gap-3">
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.2 rounded bg-slate-100">
                                        {prod.category}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const next = { ...wholesaleCart };
                                          delete next[prod.id];
                                          setWholesaleCart(next);
                                          showToast(`Removed ${prod.name} from bulk order.`);
                                        }}
                                        className="text-slate-400 hover:text-red-500 p-0.5"
                                        title="Remove product"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <h4 className="font-bold text-xs text-[#0A2540] truncate mt-0.5">{prod.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-black text-[#0A2540]">
                                        ₹{prod.dealerPrice.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/ unit</span>
                                      </span>
                                      <span className="text-[9.5px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                                        MOQ: {prod.moq}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Stepper + Line Total */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                  {/* Quantity Controls */}
                                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                                    <button
                                      onClick={() => {
                                        if (quantity > prod.moq) {
                                          setWholesaleCart({ ...wholesaleCart, [prod.id]: quantity - 1 });
                                        } else {
                                          showToast(`Wholesale minimum order requirement is ${prod.moq} units.`);
                                        }
                                      }}
                                      className={`px-2.5 py-1 text-xs font-bold transition-colors ${
                                        quantity <= prod.moq ? 'text-slate-300 hover:text-amber-600' : 'text-slate-700 hover:bg-slate-200'
                                      }`}
                                      title={quantity <= prod.moq ? `Minimum Order Quantity is ${prod.moq}` : 'Decrease'}
                                    >
                                      -
                                    </button>
                                    <span className="px-2 font-bold text-xs text-[#0A2540] min-w-[28px] text-center">
                                      {quantity}
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (quantity < prod.stockQuantity) {
                                          setWholesaleCart({ ...wholesaleCart, [prod.id]: quantity + 1 });
                                        } else {
                                          showToast(`Only ${prod.stockQuantity} units in stock.`);
                                        }
                                      }}
                                      className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                                      title="Increase"
                                    >
                                      +
                                    </button>
                                  </div>

                                  {/* Line Total */}
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block">Line Total</span>
                                    <span className="font-black text-xs text-[#0A2540]">
                                      ₹{lineTotal.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Validation Warnings */}
                                {moqViolated && (
                                  <p className="text-[10px] font-bold text-red-600">
                                    Violates Minimum Order Quantity requirement of {prod.moq} units.
                                  </p>
                                )}
                                {stockViolated && (
                                  <p className="text-[10px] font-bold text-red-600">
                                    Exceeds master warehouse stock limit of {prod.stockQuantity} units.
                                  </p>
                                )}
                              </div>
                            ))}

                            {/* Registered Delivery Warehouse Info Card */}
                            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-xs shadow-2xs space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                                <Truck className="w-3.5 h-3.5 text-teal-600" />
                                <span>Commercial Dispatch Destination</span>
                              </div>
                              <p className="text-[10.5px] text-slate-500 leading-snug">
                                {dealerProfile.registeredWarehouse}
                              </p>
                              <p className="text-[10px] text-teal-700 font-bold">
                                GSTIN: {dealerProfile.gstin}
                              </p>
                            </div>
                          </div>

                          {/* Floating Checkout Summary Box */}
                          <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3.5 shadow-xl space-y-2 z-30">
                            {/* Summary Rows */}
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-slate-500 text-[11px]">
                                <span>Wholesale Subtotal ({totalUnits} units):</span>
                                <span className="font-semibold text-slate-800">₹{subtotal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-slate-500 text-[11px]">
                                <span className="flex items-center gap-1">
                                  Commercial Freight:
                                  <span className="text-[9px] text-slate-400 font-normal">(Free &gt; ₹50k)</span>
                                </span>
                                <span className={`font-semibold ${deliveryCharges === 0 ? 'text-emerald-600 font-bold' : 'text-slate-800'}`}>
                                  {deliveryCharges === 0 ? 'FREE' : `₹${deliveryCharges.toLocaleString()}`}
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-500 text-[11px]">
                                <span>GST (18% ITC Eligible):</span>
                                <span className="font-bold text-teal-600">₹{Math.round(gstItc).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-100">
                                <span className="font-bold text-xs text-[#0A2540]">Total Net Amount:</span>
                                <span className="text-base font-black text-[#0A2540]">₹{totalAmount.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Submit Bulk Order CTA */}
                            <button
                              disabled={!canSubmit}
                              onClick={() => {
                                if (isSubmittingPO) return; // Idempotent duplicate lock
                                setIsSubmittingPO(true);
                                setTimeout(() => {
                                  const poNum = `PO-DLR-2026-${Math.floor(1100 + Math.random() * 899)}`;
                                  const newPo: DealerPurchaseOrder = {
                                    id: `po-${Date.now()}`,
                                    dealerId: dealerProfile.uid,
                                    poNumber: poNum,
                                    date: 'Today, Just Now',
                                    itemCount: totalUnits,
                                    subtotal,
                                    deliveryCharges,
                                    totalWholesaleAmount: totalAmount,
                                    paymentStatus: 'credit_net30',
                                    fulfilmentStatus: 'confirmed',
                                    deliveryAddress: dealerProfile.registeredWarehouse,
                                    dealerGstin: dealerProfile.gstin,
                                    lineItems: items.map((i) => ({
                                      productId: i.prod.id,
                                      productName: i.prod.name,
                                      category: i.prod.category,
                                      wholesalePrice: i.prod.dealerPrice,
                                      quantity: i.quantity,
                                      lineTotal: i.lineTotal,
                                    })),
                                  };
                                  setDealerOrders([newPo, ...dealerOrders]);
                                  setWholesaleCart({});
                                  setIsSubmittingPO(false);
                                  showToast(`PO ${poNum} submitted successfully!`);
                                  setCurrentScreen('dealer_order_history');
                                }, 800);
                              }}
                              className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all ${
                                canSubmit
                                  ? 'bg-[#0A2540] hover:bg-[#061B2E] text-white cursor-pointer active:scale-[0.99]'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {isSubmittingPO ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Generating Commercial PO...</span>
                                </>
                              ) : (
                                <>
                                  <FileCheck className="w-4 h-4" />
                                  <span>Submit Bulk Order (₹{totalAmount.toLocaleString()})</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* ================= SCREEN 18: DEALER ORDER HISTORY ================= */}
                {currentScreen === 'dealer_order_history' && (() => {
                  // STRICT MULTI-TENANT ISOLATION: Scoped query by current dealer's authorized UID
                  const authorizedOrders = dealerOrders.filter((o) => o.dealerId === dealerProfile.uid);

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                      {/* Top Bar */}
                      <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <button
                          onClick={() => setCurrentScreen('dealer_home')}
                          className="p-1 rounded-full text-slate-600 hover:bg-slate-100"
                        >
                          <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                        </button>
                        <div className="text-center">
                          <h2 className="text-sm font-extrabold text-[#0A2540]">Dealer Order History</h2>
                          <p className="text-[10px] text-teal-600 font-bold">Purchase Orders & Logistics</p>
                        </div>
                        <button
                          onClick={() => {
                            showToast('Refreshed dealer purchase orders.');
                          }}
                          className="p-1 text-slate-600 hover:text-slate-900 rounded-lg"
                          title="Refresh Orders"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Orders Content */}
                      {authorizedOrders.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                            <FileText className="w-8 h-8" />
                          </div>
                          <h3 className="font-extrabold text-base text-[#0A2540]">No Purchase Orders Found</h3>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                            No bulk procurement records registered for {dealerProfile.businessName}. Start ordering from the wholesale catalog.
                          </p>
                          <button
                            onClick={() => setCurrentScreen('wholesale_catalog')}
                            className="mt-4 px-4 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-bold shadow-md"
                          >
                            Browse Wholesale Catalog
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-8">
                          {authorizedOrders.map((order) => {
                            const isDelivered = order.fulfilmentStatus === 'delivered';
                            const isDispatched = order.fulfilmentStatus === 'dispatched';
                            const isConfirmed = order.fulfilmentStatus === 'confirmed';

                            return (
                              <div
                                key={order.id}
                                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                              >
                                {/* Header: PO Ref and Fulfilment Badge */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-slate-600" />
                                    <span className="font-bold text-xs text-[#0A2540]">{order.poNumber}</span>
                                  </div>
                                  <span
                                    className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                      isDelivered
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isDispatched
                                        ? 'bg-cyan-100 text-cyan-800'
                                        : isConfirmed
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {isDispatched && <Truck className="w-3 h-3" />}
                                    {isDelivered && <CheckCircle2 className="w-3 h-3" />}
                                    <span>{order.fulfilmentStatus}</span>
                                  </span>
                                </div>

                                {/* Order Date & Item Summary */}
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{order.date}</span>
                                  </div>
                                  <span className="font-medium text-slate-600">
                                    {order.itemCount} units • {order.lineItems?.length ?? 1} line item{(order.lineItems?.length ?? 1) > 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                                  {/* Amount & Payment Status */}
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">Total Net Invoice</span>
                                    <span className="font-black text-sm text-[#0A2540]">
                                      ₹{order.totalWholesaleAmount.toLocaleString()}
                                    </span>
                                    <p className="text-[10px] text-teal-700 font-semibold mt-0.5">
                                      {order.paymentStatus === 'paid_rtgs'
                                        ? 'Settled (RTGS)'
                                        : order.paymentStatus === 'credit_net30'
                                        ? 'Net 30 Credit Active'
                                        : 'Awaiting Wire'}
                                    </p>
                                  </div>

                                  {/* View Details Action */}
                                  <button
                                    onClick={() => setSelectedDealerOrderForDetails(order)}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0A2540] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <span>View Details</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Dealer Bottom Navigation */}
                      <div className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-slate-500 shrink-0">
                        <button onClick={() => setCurrentScreen('dealer_home')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600">
                          <Store className="w-4 h-4" />
                          <span className="text-[10px]">Hub</span>
                        </button>
                        <button onClick={() => setCurrentScreen('wholesale_catalog')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600">
                          <Grid className="w-4 h-4" />
                          <span className="text-[10px]">Wholesale</span>
                        </button>
                        <button onClick={() => setCurrentScreen('bulk_order_cart')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600 relative">
                          <ShoppingCart className="w-4 h-4" />
                          <span className="text-[10px]">Bulk Cart</span>
                          {Object.values(wholesaleCart).reduce((a, b) => a + b, 0) > 0 && (
                            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-teal-500" />
                          )}
                        </button>
                        <button onClick={() => setCurrentScreen('dealer_order_history')} className="flex flex-col items-center gap-0.5 text-[#0A2540] font-bold">
                          <ShoppingBag className="w-4 h-4 text-teal-600" />
                          <span className="text-[10px]">PO History</span>
                        </button>
                        <button onClick={() => setCurrentScreen('profile')} className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600">
                          <User className="w-4 h-4" />
                          <span className="text-[10px]">Profile</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal: Screen 18 Order Details Sheet */}
                {selectedDealerOrderForDetails && (
                  <div className="absolute inset-0 bg-black/50 z-40 flex items-end">
                    <div className="w-full bg-white rounded-t-3xl p-5 shadow-2xl max-h-[90%] overflow-y-auto space-y-3">
                      {/* Modal Header */}
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="font-extrabold text-sm text-[#0A2540]">
                            {selectedDealerOrderForDetails.poNumber}
                          </h3>
                          <p className="text-[10px] text-slate-400">{selectedDealerOrderForDetails.date}</p>
                        </div>
                        <button
                          onClick={() => setSelectedDealerOrderForDetails(null)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Delivery Address & GSTIN Box */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                          <Building2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Delivery Warehouse Destination</span>
                        </div>
                        <p className="text-[10.5px] text-slate-500">{selectedDealerOrderForDetails.deliveryAddress}</p>
                        <div className="flex justify-between items-center pt-1 text-[10px] text-slate-400 border-t border-slate-200/60">
                          <span>GSTIN: <span className="font-bold text-slate-700">{selectedDealerOrderForDetails.dealerGstin}</span></span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase text-[9px]">
                            {selectedDealerOrderForDetails.fulfilmentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Purchased Line Items */}
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-xs text-[#0A2540]">Purchased Products</h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {(selectedDealerOrderForDetails.lineItems ?? []).map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {item.quantity}x
                                </span>
                                <div>
                                  <p className="font-bold text-[#0A2540] text-[11px] truncate max-w-[170px]">{item.productName}</p>
                                  <p className="text-[9.5px] text-slate-400">₹{item.wholesalePrice.toLocaleString()} / unit</p>
                                </div>
                              </div>
                              <span className="font-black text-[#0A2540] text-xs">
                                ₹{item.lineTotal.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Wholesale Subtotal:</span>
                          <span className="font-semibold text-slate-800">
                            ₹{(selectedDealerOrderForDetails.subtotal ?? selectedDealerOrderForDetails.totalWholesaleAmount).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Freight & Logistics:</span>
                          <span className="font-semibold text-emerald-600">
                            {selectedDealerOrderForDetails.deliveryCharges === 0 ? 'FREE' : `₹${selectedDealerOrderForDetails.deliveryCharges?.toLocaleString()}`}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Included GST (18% ITC):</span>
                          <span className="font-bold text-teal-600">
                            ₹{Math.round(((selectedDealerOrderForDetails.subtotal ?? selectedDealerOrderForDetails.totalWholesaleAmount) * 0.18) / 1.18).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
                          <span className="font-bold text-xs text-[#0A2540]">Net Grand Total:</span>
                          <span className="font-black text-sm text-[#0A2540]">
                            ₹{selectedDealerOrderForDetails.totalWholesaleAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Support & Action */}
                      <div className="pt-1 flex gap-2">
                        <button
                          onClick={() => {
                            showToast(`Connected with Account Manager for ${selectedDealerOrderForDetails.poNumber}.`);
                          }}
                          className="flex-1 py-2.5 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Contact Account Manager</span>
                        </button>
                        <button
                          onClick={() => setSelectedDealerOrderForDetails(null)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal: Edit Profile Dialog */}
                {isEditingProfile && (
                  <div className="absolute inset-0 bg-black/50 z-40 flex items-end">
                    <div className="w-full bg-white rounded-t-3xl p-5 shadow-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm text-[#0A2540]">Edit Profile</h3>
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setProfile({ ...profile, fullName: editName, phone: editPhone });
                            setIsEditingProfile(false);
                            showToast('Profile updated successfully!');
                          }}
                          className="flex-1 py-2.5 bg-[#0A2540] text-white rounded-xl font-bold text-xs shadow-md"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 23: SERVICE BOOKING ================= */}
                {currentScreen === 'service_booking' && (() => {
                  const applicableProductChoices = SERVICE_APPLICABLE_PRODUCTS.filter(
                    (p) => !p.onlyMaintenance || serviceCategory === 'Maintenance'
                  );

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                      {/* Mobile App Bar */}
                      <div className="bg-white px-4 h-14 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('home')}
                          aria-label="Back to Customer Home"
                          className="w-11 h-11 -ml-2 rounded-xl flex items-center justify-center text-[#0A2540] hover:bg-slate-100 cursor-pointer"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center min-w-0">
                          <h2 className="text-sm font-extrabold text-[#0A2540] truncate">
                            Book Purifier Service
                          </h2>
                          <p className="text-[10px] text-slate-500">
                            {firebaseUser
                              ? 'Connected to Cloud Firestore'
                              : 'Sign in above for live Firestore write'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsMyRequestsDrawerOpen(true)}
                          aria-label="View My Service Requests"
                          className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer relative"
                          title="My Service Requests"
                        >
                          <FileText className="w-4 h-4" />
                          {allMyServiceRequests.length > 0 && (
                            <span className="absolute top-2 right-2 text-[9px] font-mono font-bold text-teal-700">
                              {allMyServiceRequests.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Scrollable Booking Form */}
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-24">
                        {serviceSubmitError && (
                          <div
                            role="alert"
                            className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2"
                          >
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{serviceSubmitError}</span>
                          </div>
                        )}

                        {/* 1. Service Type Selection */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#0A2540]">
                              01. Service Type
                            </span>
                            <span className="text-[10.5px] text-slate-400">Required</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {(['Installation', 'Maintenance', 'Repair'] as const).map((cat) => {
                              const isSelected = serviceCategory === cat;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setServiceCategory(cat);
                                    if (cat !== 'Maintenance' && !serviceProductId) {
                                      setServiceProductId('wp-01');
                                      setServiceProductModel(
                                        'Califnco Hydra Pure Elite RO+UV+Copper'
                                      );
                                    }
                                    setServiceFormErrors((prev) => {
                                      const next = { ...prev };
                                      delete next.product;
                                      return next;
                                    });
                                  }}
                                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition-colors border cursor-pointer whitespace-nowrap ${
                                    isSelected
                                      ? 'bg-[#0A2540] text-white border-[#0A2540]'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Relevant Product Selection */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="service-product-select"
                              className="text-xs font-extrabold text-[#0A2540]"
                            >
                              02. Relevant Califnco Product
                            </label>
                            <span className="text-[10.5px] text-slate-400">
                              {serviceCategory === 'Maintenance' ? 'Optional' : 'Required'}
                            </span>
                          </div>
                          <select
                            id="service-product-select"
                            value={serviceProductId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              const match = SERVICE_APPLICABLE_PRODUCTS.find(
                                (p) => p.id === nextId
                              );
                              setServiceProductId(nextId);
                              setServiceProductModel(
                                match?.name || 'General Water System Assessment'
                              );
                              setServiceFormErrors((prev) => {
                                const next = { ...prev };
                                delete next.product;
                                return next;
                              });
                            }}
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-[#0A2540] outline-none focus:border-teal-600"
                          >
                            {applicableProductChoices.map((prod) => (
                              <option key={prod.id || 'general'} value={prod.id}>
                                {prod.name} ({prod.badge})
                              </option>
                            ))}
                          </select>
                          {serviceFormErrors.product && (
                            <p className="text-[11px] font-medium text-red-600">
                              {serviceFormErrors.product}
                            </p>
                          )}
                        </div>

                        {/* 3. Description of the Issue */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="service-issue-desc"
                              className="text-xs font-extrabold text-[#0A2540]"
                            >
                              03. Description of Issue / Request
                            </label>
                            <span className="text-[10px] font-mono tabular-nums text-slate-400">
                              {serviceDescription.trim().length}/600
                            </span>
                          </div>
                          <textarea
                            id="service-issue-desc"
                            rows={3}
                            maxLength={600}
                            value={serviceDescription}
                            onChange={(e) => {
                              setServiceDescription(e.target.value);
                              setServiceFormErrors((prev) => {
                                const next = { ...prev };
                                delete next.description;
                                return next;
                              });
                            }}
                            placeholder={
                              serviceCategory === 'Installation'
                                ? 'Describe mounting surface, water inlet point, and plumbing readiness...'
                                : 'Describe low water flow, TDS taste change, indicator alert, or leak...'
                            }
                            className={`w-full p-2.5 rounded-xl border bg-slate-50 text-xs text-slate-800 leading-relaxed resize-none outline-none focus:border-teal-600 ${
                              serviceFormErrors.description
                                ? 'border-red-400'
                                : 'border-slate-200'
                            }`}
                          />
                          {serviceFormErrors.description && (
                            <p className="text-[11px] font-medium text-red-600">
                              {serviceFormErrors.description}
                            </p>
                          )}
                        </div>

                        {/* 4. Service Address */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#0A2540]">
                              04. Service Address
                            </span>
                            <span className="text-[10.5px] text-slate-400">Site Location</span>
                          </div>

                          {/* Saved Address Selector */}
                          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                            {addresses.map((addr) => (
                              <button
                                key={addr.id}
                                type="button"
                                onClick={() => handleSelectSavedServiceAddress(addr.id)}
                                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
                                  selectedServiceAddressId === addr.id
                                    ? 'bg-teal-50 border-teal-600 text-teal-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                {addr.label} · {addr.postalCode}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleSelectSavedServiceAddress('custom')}
                              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
                                selectedServiceAddressId === 'custom'
                                  ? 'bg-teal-50 border-teal-600 text-teal-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              Custom Site
                            </button>
                          </div>

                          <div className="space-y-2">
                            <input
                              type="text"
                              value={serviceStreetAddress}
                              onChange={(e) => {
                                setSelectedServiceAddressId('custom');
                                setServiceStreetAddress(e.target.value);
                              }}
                              placeholder="Flat / House No., Building, Street"
                              aria-label="Service street address"
                              className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600 ${
                                serviceFormErrors.streetAddress
                                  ? 'border-red-400'
                                  : 'border-slate-200'
                              }`}
                            />
                            <div className="grid grid-cols-5 gap-2">
                              <input
                                type="text"
                                value={serviceCityState}
                                onChange={(e) => {
                                  setSelectedServiceAddressId('custom');
                                  setServiceCityState(e.target.value);
                                }}
                                placeholder="City, State"
                                aria-label="Service city and state"
                                className={`col-span-3 min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600 ${
                                  serviceFormErrors.cityState
                                    ? 'border-red-400'
                                    : 'border-slate-200'
                                }`}
                              />
                              <input
                                type="text"
                                value={servicePostalCode}
                                onChange={(e) => {
                                  setSelectedServiceAddressId('custom');
                                  setServicePostalCode(e.target.value);
                                }}
                                placeholder="PIN Code"
                                aria-label="Service PIN code"
                                className={`col-span-2 min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs font-mono tabular-nums text-slate-800 outline-none focus:border-teal-600 ${
                                  serviceFormErrors.postalCode
                                    ? 'border-red-400'
                                    : 'border-slate-200'
                                }`}
                              />
                            </div>
                            {(serviceFormErrors.streetAddress ||
                              serviceFormErrors.cityState ||
                              serviceFormErrors.postalCode) && (
                              <p className="text-[11px] font-medium text-red-600">
                                {serviceFormErrors.streetAddress ||
                                  serviceFormErrors.cityState ||
                                  serviceFormErrors.postalCode}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 5. Preferred Date & Configured Time Slots ONLY When Supplied */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="service-preferred-date"
                              className="text-xs font-extrabold text-[#0A2540]"
                            >
                              05. Preferred Service Date
                            </label>
                            <span className="text-[10.5px] text-slate-400">
                              Subject to confirmation
                            </span>
                          </div>

                          <input
                            id="service-preferred-date"
                            type="date"
                            min={new Date().toISOString().slice(0, 10)}
                            value={servicePreferredDate}
                            onChange={(e) => {
                              setServicePreferredDate(e.target.value);
                              setServiceFormErrors((prev) => {
                                const next = { ...prev };
                                delete next.preferredDate;
                                return next;
                              });
                            }}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs font-mono tabular-nums text-[#0A2540] font-semibold outline-none focus:border-teal-600 ${
                              serviceFormErrors.preferredDate
                                ? 'border-red-400'
                                : 'border-slate-200'
                            }`}
                          />
                          {serviceFormErrors.preferredDate && (
                            <p className="text-[11px] font-medium text-red-600">
                              {serviceFormErrors.preferredDate}
                            </p>
                          )}

                          {/* Time Slots: Shown ONLY when supplied by configured scheduling system */}
                          {isCheckingSchedule ? (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                              Checking scheduling configuration for PIN {servicePostalCode}...
                            </div>
                          ) : scheduleLookup.isConfigured &&
                            scheduleLookup.availableSlots.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[#0A2540]">
                                  Configured Preferred Time Slots
                                </span>
                                <span className="text-[10px] font-mono text-teal-700">
                                  {scheduleLookup.source === 'firestore'
                                    ? 'Live Firestore Roster'
                                    : 'Configured Roster'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {scheduleLookup.availableSlots.map((slot) => {
                                  const chosen = serviceSelectedSlot === slot;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      onClick={() =>
                                        setServiceSelectedSlot(chosen ? '' : slot)
                                      }
                                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-left text-xs font-mono tabular-nums flex items-center justify-between transition-colors cursor-pointer ${
                                        chosen
                                          ? 'bg-teal-50 border-teal-600 text-[#0A2540] font-bold'
                                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{slot}</span>
                                      <span className="text-[10px] font-sans font-semibold text-teal-700">
                                        {chosen ? 'Selected Preference' : 'Select'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[10.5px] text-slate-500 leading-snug">
                                Selecting a slot records your preferred window. Your appointment is
                                confirmed only after Service Desk technician assignment.
                              </p>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                              Online time slots are not configured for this date and PIN. Submit your
                              preferred date and Califnco Service Desk will call to confirm an
                              available appointment window.
                            </div>
                          )}
                        </div>

                        {/* 6. Contact Person & Phone Number */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="service-contact-phone"
                              className="text-xs font-extrabold text-[#0A2540]"
                            >
                              06. Contact Phone Number
                            </label>
                            <span className="text-[10.5px] text-slate-400">For Confirmation Call</span>
                          </div>
                          <input
                            type="text"
                            value={serviceContactName}
                            onChange={(e) => {
                              setServiceContactName(e.target.value);
                              setServiceFormErrors((prev) => {
                                const next = { ...prev };
                                delete next.contactName;
                                return next;
                              });
                            }}
                            placeholder="On-site contact person name"
                            aria-label="Contact person name"
                            className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600 ${
                              serviceFormErrors.contactName
                                ? 'border-red-400'
                                : 'border-slate-200'
                            }`}
                          />
                          <div className="flex items-center border rounded-xl px-3 min-h-[44px] bg-slate-50 focus-within:border-teal-600 border-slate-200">
                            <Phone className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                            <input
                              id="service-contact-phone"
                              type="tel"
                              value={serviceContactPhone}
                              onChange={(e) => {
                                setServiceContactPhone(e.target.value);
                                setServiceFormErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.contactPhone;
                                  return next;
                                });
                              }}
                              placeholder="+91 98765 43210"
                              className="w-full bg-transparent text-xs font-mono tabular-nums text-slate-800 outline-none"
                            />
                          </div>
                          {(serviceFormErrors.contactName || serviceFormErrors.contactPhone) && (
                            <p className="text-[11px] font-medium text-red-600">
                              {serviceFormErrors.contactName || serviceFormErrors.contactPhone}
                            </p>
                          )}
                        </div>

                        {/* Unconfirmed Appointment Disclosure */}
                        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                          <span className="font-bold">Important:</span> Submitting this request does
                          not lock a guaranteed technician arrival time. Appointment times are
                          confirmed only after dispatch verification.
                        </div>
                      </div>

                      {/* Sticky Submit Footer */}
                      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
                        <button
                          type="button"
                          disabled={isSubmittingService}
                          onClick={handleServiceBookingSubmit}
                          className="w-full min-h-[48px] rounded-xl bg-[#0A2540] hover:bg-[#061B2E] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          {isSubmittingService ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Saving Service Request...</span>
                            </>
                          ) : (
                            <span>Submit Request</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ================= SCREEN 24: BOOKING CONFIRMATION ================= */}
                {currentScreen === 'booking_confirmation' && (() => {
                  const booking = activeBookingForConfirmation;
                  const isConfirmedAppointment =
                    booking.status === 'scheduled' || booking.status === 'in_progress';

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                      {/* App Bar */}
                      <div className="bg-white px-4 h-14 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <h2 className="text-sm font-extrabold text-[#0A2540] truncate">
                          {isConfirmedAppointment
                            ? 'Appointment Confirmed'
                            : 'Service Request Submitted'}
                        </h2>
                        <span className="text-[10.5px] font-mono tabular-nums text-slate-500">
                          {booking.persistedToFirestore ? 'Firestore Synced' : 'Preview Record'}
                        </span>
                      </div>

                      {/* Scrollable Confirmation Details */}
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-6">
                        {/* Clear Distinction Banner: Submitted Request vs Confirmed Appointment */}
                        <div
                          className={`p-4 rounded-2xl border bg-white space-y-2.5 ${
                            isConfirmedAppointment ? 'border-teal-600' : 'border-amber-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isConfirmedAppointment
                                  ? 'bg-teal-50 text-teal-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {isConfirmedAppointment ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Clock className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold text-[#0A2540]">
                                {isConfirmedAppointment
                                  ? 'Confirmed Technician Appointment'
                                  : 'Request Submitted — Appointment Not Yet Confirmed'}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums font-bold text-teal-700 mt-0.5">
                                Ref: {booking.ticketNumber}
                              </div>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {isConfirmedAppointment
                              ? 'Califnco Service Desk has verified technician availability and confirmed your scheduled visit.'
                              : 'Your request has been logged in our queue, but no technician arrival time is promised yet. A coordinator will confirm availability with you.'}
                          </p>
                        </div>

                        {/* Request Summary Card */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                          <h3 className="font-extrabold text-xs text-[#0A2540]">
                            Booking Details
                          </h3>
                          <dl className="divide-y divide-slate-100 text-[11.5px]">
                            <div className="py-2 flex justify-between gap-3">
                              <dt className="text-slate-500">Request Reference</dt>
                              <dd className="font-mono tabular-nums font-bold text-[#0A2540] text-right">
                                {booking.ticketNumber}
                              </dd>
                            </div>
                            <div className="py-2 flex justify-between gap-3">
                              <dt className="text-slate-500">Current Status</dt>
                              <dd
                                className={`font-bold text-right ${
                                  isConfirmedAppointment ? 'text-teal-700' : 'text-amber-700'
                                }`}
                              >
                                {booking.status === 'open'
                                  ? 'Request Submitted (Unconfirmed)'
                                  : booking.status === 'scheduled'
                                  ? 'Appointment Confirmed'
                                  : booking.status === 'in_progress'
                                  ? 'Technician On-Site'
                                  : booking.status === 'completed'
                                  ? 'Completed'
                                  : 'Cancelled'}
                              </dd>
                            </div>
                            <div className="py-2 flex justify-between gap-3">
                              <dt className="text-slate-500">Requested Service</dt>
                              <dd className="font-semibold text-[#0A2540] text-right">
                                {booking.requestCategory}
                              </dd>
                            </div>
                            {booking.productModel && (
                              <div className="py-2 flex justify-between gap-3">
                                <dt className="text-slate-500 shrink-0">Product</dt>
                                <dd className="font-medium text-slate-800 text-right">
                                  {booking.productModel}
                                </dd>
                              </div>
                            )}
                            <div className="py-2 flex justify-between gap-3">
                              <dt className="text-slate-500">
                                {isConfirmedAppointment ? 'Confirmed Date' : 'Preferred Date'}
                              </dt>
                              <dd className="font-mono tabular-nums font-semibold text-[#0A2540] text-right">
                                {booking.preferredDateIso || 'Flexible'}
                              </dd>
                            </div>
                            {booking.preferredTimeSlot && (
                              <div className="py-2 flex justify-between gap-3">
                                <dt className="text-slate-500">
                                  {isConfirmedAppointment
                                    ? 'Confirmed Time'
                                    : 'Preferred Window (Unconfirmed)'}
                                </dt>
                                <dd className="font-mono tabular-nums font-medium text-slate-800 text-right">
                                  {booking.preferredTimeSlot}
                                </dd>
                              </div>
                            )}
                            <div className="py-2 space-y-1">
                              <dt className="text-slate-500">Service Address</dt>
                              <dd className="font-medium text-slate-800 leading-snug">
                                {booking.serviceAddress}
                              </dd>
                            </div>
                            {booking.contactPhone && (
                              <div className="py-2 flex justify-between gap-3">
                                <dt className="text-slate-500">Contact Phone</dt>
                                <dd className="font-mono tabular-nums text-slate-800">
                                  {booking.contactPhone}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                          <h3 className="font-extrabold text-xs text-[#0A2540]">Next Steps</h3>
                          {isConfirmedAppointment ? (
                            <ol className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                              <li className="flex gap-2">
                                <span className="font-mono font-bold text-teal-700">01.</span>
                                <span>
                                  Your assigned Califnco specialist calls 30 minutes before arrival.
                                </span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-mono font-bold text-teal-700">02.</span>
                                <span>
                                  Keep water inlet valve and electrical socket accessible near the
                                  unit.
                                </span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-mono font-bold text-teal-700">03.</span>
                                <span>
                                  Post-service TDS reading and service notes are recorded upon
                                  completion.
                                </span>
                              </li>
                            </ol>
                          ) : (
                            <ol className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                              <li className="flex gap-2">
                                <span className="font-mono font-bold text-teal-700">01.</span>
                                <span>
                                  Califnco Service Desk checks regional technician availability for
                                  your PIN code.
                                </span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-mono font-bold text-teal-700">02.</span>
                                <span>
                                  A coordinator calls {booking.contactPhone || 'your number'} to
                                  confirm a guaranteed date and arrival window.
                                </span>
                              </li>
                              <li className="flex gap-2">
                                <span className="font-mono font-bold text-teal-700">03.</span>
                                <span>
                                  Once confirmed by Service Desk, status changes to Appointment
                                  Confirmed.
                                </span>
                              </li>
                            </ol>
                          )}
                        </div>

                        {/* Primary & Secondary CTAs */}
                        <div className="space-y-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsMyRequestsDrawerOpen(true)}
                            className="w-full min-h-[46px] rounded-xl border border-[#0A2540] bg-white hover:bg-slate-50 text-[#0A2540] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>View My Requests ({allMyServiceRequests.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentScreen('home')}
                            className="w-full min-h-[46px] rounded-xl bg-[#0A2540] hover:bg-[#061B2E] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Home className="w-4 h-4" />
                            <span>Return Home</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ================= SCREEN 25: NOTIFICATIONS ================= */}
                {currentScreen === 'notifications' && (() => {
                  const displayedNotifications =
                    notificationsFilter === 'unread'
                      ? activeNotifications.filter((n) => !n.isRead)
                      : activeNotifications;

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                      {/* Compact Top App Bar */}
                      <div className="bg-white px-4 h-14 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => setCurrentScreen('home')}
                            aria-label="Back to Home"
                            className="min-w-[40px] min-h-[40px] -ml-2 rounded-xl flex items-center justify-center text-[#0A2540] hover:bg-slate-100 cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <h2 className="text-sm font-extrabold text-[#0A2540] truncate">
                            Notifications
                          </h2>
                        </div>

                        {unreadNotificationCount > 0 ? (
                          <button
                            type="button"
                            onClick={handleMarkAllNotificationsRead}
                            className="min-h-[40px] px-2.5 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Mark all read
                          </button>
                        ) : (
                          <span className="text-[10.5px] font-mono tabular-nums text-slate-400 shrink-0">
                            {firebaseUser ? 'Live Inbox' : 'Demo Inbox'}
                          </span>
                        )}
                      </div>

                      {/* Foreground Notification Heads-Up Banner (Distinct from Background OS Tray) */}
                      {foregroundBannerAlert && (
                        <div className="mx-3.5 mt-2.5 p-3 rounded-2xl bg-[#0A2540] text-white flex items-start justify-between gap-2.5 shadow-md shrink-0">
                          <div className="min-w-0 space-y-0.5">
                            <div className="text-[10.5px] font-semibold text-teal-300">
                              Foreground Notification Event
                            </div>
                            <div className="text-xs font-bold truncate">
                              {foregroundBannerAlert.title}
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">
                              {foregroundBannerAlert.body}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForegroundBannerAlert(null)}
                            aria-label="Dismiss foreground notification banner"
                            className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10 shrink-0 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Scrollable Notification Feed */}
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-6">
                        {/* Honest FCM Permission & Device Token Registration Card */}
                        {fcmStatus && (
                          <div
                            className={`p-3 rounded-2xl bg-white border space-y-2 ${
                              fcmStatus.isPushRegistered
                                ? 'border-teal-600'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    fcmStatus.isPushRegistered
                                      ? 'bg-teal-50 text-teal-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <Bell className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-[#0A2540]">
                                    {fcmStatus.summaryTitle}
                                  </div>
                                  <p className="text-[10.5px] text-slate-500 leading-relaxed mt-0.5">
                                    {fcmStatus.detailMessage}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[10.5px] text-slate-500">
                              <span className="font-mono tabular-nums truncate">
                                Permission: {fcmStatus.browserPermission} ·{' '}
                                {fcmStatus.isPushRegistered
                                  ? 'Token Registered'
                                  : 'No Push Fabricated'}
                              </span>
                              {(fcmStatus.mode === 'permission_default' ||
                                fcmStatus.mode === 'vapid_or_sw_unconfigured') && (
                                <button
                                  type="button"
                                  disabled={isRequestingFcm}
                                  onClick={handleRequestPushPermissions}
                                  className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0A2540] font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  {isRequestingFcm ? 'Checking...' : 'Configure Push'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Interactive Filter Controls (All vs Unread) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setNotificationsFilter('all')}
                              className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                                notificationsFilter === 'all'
                                  ? 'bg-white text-[#0A2540] shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              All ({activeNotifications.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setNotificationsFilter('unread')}
                              className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                                notificationsFilter === 'unread'
                                  ? 'bg-white text-[#0A2540] shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Unread ({unreadNotificationCount})
                            </button>
                          </div>

                          <span className="text-[10.5px] text-slate-500 whitespace-nowrap">
                            {firebaseUser && firebaseUser.emailVerified
                              ? 'Firestore Trusted Stream'
                              : 'Demo Preview Data'}
                          </span>
                        </div>

                        {/* Loading / Empty / Notification List */}
                        {isLoadingNotifications ? (
                          <div className="py-14 flex flex-col items-center justify-center gap-2 text-slate-500">
                            <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                            <span className="text-xs font-medium">
                              Syncing trusted notifications...
                            </span>
                          </div>
                        ) : displayedNotifications.length === 0 ? (
                          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2.5 my-2">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                              <Bell className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-extrabold text-[#0A2540]">
                              {notificationsFilter === 'unread'
                                ? 'All Notifications Read'
                                : 'No Notifications Yet'}
                            </h3>
                            <p className="text-[11.5px] text-slate-500 leading-relaxed max-w-[250px] mx-auto">
                              {notificationsFilter === 'unread'
                                ? 'You have caught up on every order dispatch, delivery, and payment update.'
                                : firebaseUser
                                ? 'Trusted order updates from Califnco Order Management (Page 20) or Cloud Functions will appear here.'
                                : 'Order confirmation, dispatch, and delivery alerts will appear here when triggered by backend events.'}
                            </p>
                            {notificationsFilter === 'unread' && activeNotifications.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setNotificationsFilter('all')}
                                className="mt-1 min-h-[42px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0A2540] font-bold text-xs cursor-pointer"
                              >
                                Show All Notifications
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {displayedNotifications.map((item) => {
                              const unread = !item.isRead;
                              return (
                                <article
                                  key={item.id}
                                  className={`p-3.5 rounded-2xl border transition-colors space-y-2 ${
                                    unread
                                      ? 'bg-teal-50/40 border-teal-600/60'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div
                                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                        unread
                                          ? 'bg-teal-100/80 text-teal-800'
                                          : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {item.eventType === 'order_dispatched' ? (
                                        <Truck className="w-4 h-4" />
                                      ) : item.eventType === 'payment_settled' ? (
                                        <CreditCard className="w-4 h-4" />
                                      ) : item.eventType === 'order_delivered' ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                      ) : (
                                        <Package className="w-4 h-4" />
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <h3
                                          className={`text-xs leading-snug ${
                                            unread
                                              ? 'font-extrabold text-[#0A2540]'
                                              : 'font-semibold text-slate-700'
                                          }`}
                                        >
                                          {item.title}
                                        </h3>
                                        <span
                                          className={`text-[10.5px] font-bold whitespace-nowrap shrink-0 ${
                                            unread ? 'text-teal-700' : 'text-slate-400'
                                          }`}
                                        >
                                          {unread ? 'Unread' : 'Read'}
                                        </span>
                                      </div>

                                      <p className="text-[11.5px] text-slate-600 leading-relaxed mt-1">
                                        {item.body}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[10.5px] text-slate-500">
                                    <div className="font-mono tabular-nums truncate">
                                      <span>{formatRelativeNotificationTime(item.createdAtIso)}</span>
                                      {item.orderNumber && (
                                        <>
                                          <span aria-hidden="true"> · </span>
                                          <span>{item.orderNumber}</span>
                                        </>
                                      )}
                                      <span aria-hidden="true"> · </span>
                                      <span>
                                        {item.persistedToFirestore ? 'Trusted Event' : 'Demo'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {item.orderNumber && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (unread) void handleMarkNotificationRead(item);
                                            setCurrentScreen('order_detail_view');
                                          }}
                                          className="min-h-[36px] px-2 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                                        >
                                          Order
                                        </button>
                                      )}
                                      {unread && (
                                        <button
                                          type="button"
                                          onClick={() => void handleMarkNotificationRead(item)}
                                          className="min-h-[36px] px-2.5 rounded-lg bg-[#0A2540] hover:bg-[#061B2E] text-white text-[11px] font-bold whitespace-nowrap cursor-pointer"
                                        >
                                          Mark as read
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ================= SCREEN 26: DELIVERY LOCATION ================= */}
                {currentScreen === 'delivery_location' && (() => {
                  const showInteractiveMap = !manualAddressFallbackMode && !osmTileLoadFailed;

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                      {/* Compact Top App Bar */}
                      <div className="bg-white px-4 h-14 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => setCurrentScreen(returnScreenAfterLocationSave)}
                            aria-label="Back"
                            className="min-w-[40px] min-h-[40px] -ml-2 rounded-xl flex items-center justify-center text-[#0A2540] hover:bg-slate-100 cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <h2 className="text-sm font-extrabold text-[#0A2540] truncate">
                            Delivery Location
                          </h2>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const nextManual = !manualAddressFallbackMode;
                            setManualAddressFallbackMode(nextManual);
                            if (nextManual) {
                              setLocationCaptureSource('manual_only');
                            } else if (selectedMapPin) {
                              setLocationCaptureSource('map_pin');
                            }
                          }}
                          className="min-h-[40px] px-2.5 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {manualAddressFallbackMode ? 'Use Map Pin' : 'Manual Fallback'}
                        </button>
                      </div>

                      {/* Scrollable Map & Postal Form */}
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-6">
                        {locSubmitError && (
                          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-[11px] font-medium flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <span>{locSubmitError}</span>
                          </div>
                        )}

                        {/* OpenStreetMap Display OR Manual Address Fallback Surface */}
                        {showInteractiveMap ? (
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <OpenStreetMapPicker
                              selectedPin={selectedMapPin}
                              center={mapCenter}
                              onSelectPin={(pt) => {
                                setSelectedMapPin(pt);
                                setLocationCaptureSource('map_pin');
                              }}
                              onTileLoadError={() => setOsmTileLoadFailed(true)}
                            />

                            {/* Map Controls & Coordinate Readout */}
                            <div className="p-3 space-y-2 border-t border-slate-100 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-mono tabular-nums text-[11px] font-semibold text-[#0A2540] truncate">
                                  {selectedMapPin
                                    ? `Pin: ${selectedMapPin.lat.toFixed(5)}, ${selectedMapPin.lng.toFixed(5)}`
                                    : 'No pin selected · Tap map to drop pin'}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={isLocatingBrowserGps}
                                    onClick={handleBrowserLocateMe}
                                    className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0A2540] font-bold text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                                  >
                                    <Navigation className="w-3 h-3 text-teal-600" />
                                    <span>{isLocatingBrowserGps ? 'Locating...' : 'GPS Pin'}</span>
                                  </button>
                                  {selectedMapPin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMapPin(null);
                                        setLocationCaptureSource('manual_only');
                                      }}
                                      className="min-h-[36px] px-2 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Quick City Center Jump Presets (moves map camera only; never fabricates street address) */}
                              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                                {OSM_NEIGHBORHOOD_PRESETS.map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      setMapCenter(preset.point);
                                      setSelectedMapPin(preset.point);
                                      setLocationCaptureSource('map_pin');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10.5px] font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-extrabold text-[#0A2540]">
                                  {osmTileLoadFailed
                                    ? 'OpenStreetMap Tiles Unavailable — Manual Entry Active'
                                    : 'Manual Address Entry Fallback Active'}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                                  Your delivery address will be saved using postal text fields only (
                                  <code>locationSource: manual_only</code>) with no map coordinates
                                  required.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setOsmTileLoadFailed(false);
                                  setManualAddressFallbackMode(false);
                                  if (!selectedMapPin) {
                                    setSelectedMapPin(mapCenter);
                                  }
                                  setLocationCaptureSource('map_pin');
                                }}
                                className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0A2540] font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Show Map
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Critical Invariant Disclosure: Map Coordinate != Verified Postal Address */}
                        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                          <span className="font-bold">Unverified Coordinate Notice:</span> Selecting
                          a map pin records latitude/longitude to assist technician &amp; courier
                          routing, and never automatically produces a verified postal address. Enter
                          and confirm your complete street address and PIN code below.
                        </div>

                        {/* Address Label & Postal Text Fields */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-[#0A2540]">
                              Postal Address Details
                            </span>
                            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-xl">
                              {(['Home', 'Work', 'Other'] as const).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setLocLabel(tag)}
                                  className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                    locLabel === tag
                                      ? 'bg-[#0A2540] text-white'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="loc-recipient"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Recipient Full Name *
                            </label>
                            <input
                              id="loc-recipient"
                              type="text"
                              value={locRecipientName}
                              onChange={(e) => {
                                setLocRecipientName(e.target.value);
                                setLocFormErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.recipientName;
                                  return next;
                                });
                              }}
                              placeholder="e.g. Sarah Jenkins"
                              className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600 ${
                                locFormErrors.recipientName ? 'border-red-400' : 'border-slate-200'
                              }`}
                            />
                            {locFormErrors.recipientName && (
                              <p className="text-[11px] text-red-600 font-medium mt-1">
                                {locFormErrors.recipientName}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="loc-phone"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Contact Phone Number *
                            </label>
                            <input
                              id="loc-phone"
                              type="tel"
                              value={locPhone}
                              onChange={(e) => {
                                setLocPhone(e.target.value);
                                setLocFormErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.phone;
                                  return next;
                                });
                              }}
                              placeholder="+91 98765 43210"
                              className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs font-mono tabular-nums text-slate-800 outline-none focus:border-teal-600 ${
                                locFormErrors.phone ? 'border-red-400' : 'border-slate-200'
                              }`}
                            />
                            {locFormErrors.phone && (
                              <p className="text-[11px] text-red-600 font-medium mt-1">
                                {locFormErrors.phone}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="loc-street"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Flat / House No., Building &amp; Street *
                            </label>
                            <textarea
                              id="loc-street"
                              rows={2}
                              value={locStreetAddress}
                              onChange={(e) => {
                                setLocStreetAddress(e.target.value);
                                setLocFormErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.streetAddress;
                                  return next;
                                });
                              }}
                              placeholder="Flat 402, Green Park Avenue, Link Road"
                              className={`w-full px-3 py-2 rounded-xl border bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600 resize-none ${
                                locFormErrors.streetAddress ? 'border-red-400' : 'border-slate-200'
                              }`}
                            />
                            {locFormErrors.streetAddress && (
                              <p className="text-[11px] text-red-600 font-medium mt-1">
                                {locFormErrors.streetAddress}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="loc-landmark"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Landmark (Optional)
                            </label>
                            <input
                              id="loc-landmark"
                              type="text"
                              value={locLandmark}
                              onChange={(e) => setLocLandmark(e.target.value)}
                              placeholder="Near Metro Station / Water Tank"
                              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label
                                htmlFor="loc-city"
                                className="block text-[11px] font-bold text-slate-700 mb-1"
                              >
                                City / Town *
                              </label>
                              <input
                                id="loc-city"
                                type="text"
                                value={locCity}
                                onChange={(e) => {
                                  setLocCity(e.target.value);
                                  setLocFormErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.city;
                                    return next;
                                  });
                                }}
                                placeholder="Mumbai"
                                className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600 ${
                                  locFormErrors.city ? 'border-red-400' : 'border-slate-200'
                                }`}
                              />
                              {locFormErrors.city && (
                                <p className="text-[11px] text-red-600 font-medium mt-1">
                                  {locFormErrors.city}
                                </p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor="loc-pin"
                                className="block text-[11px] font-bold text-slate-700 mb-1"
                              >
                                Postal / PIN Code *
                              </label>
                              <input
                                id="loc-pin"
                                type="text"
                                value={locPostalCode}
                                onChange={(e) => {
                                  setLocPostalCode(e.target.value);
                                  setLocFormErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.postalCode;
                                    return next;
                                  });
                                }}
                                placeholder="400050"
                                className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs font-mono tabular-nums text-slate-800 outline-none focus:border-teal-600 ${
                                  locFormErrors.postalCode ? 'border-red-400' : 'border-slate-200'
                                }`}
                              />
                              {locFormErrors.postalCode && (
                                <p className="text-[11px] text-red-600 font-medium mt-1">
                                  {locFormErrors.postalCode}
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="loc-state"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              State / Province *
                            </label>
                            <input
                              id="loc-state"
                              type="text"
                              value={locState}
                              onChange={(e) => {
                                setLocState(e.target.value);
                                setLocFormErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.state;
                                  return next;
                                });
                              }}
                              placeholder="Maharashtra"
                              className={`w-full min-h-[44px] px-3 py-2 rounded-xl border bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600 ${
                                locFormErrors.state ? 'border-red-400' : 'border-slate-200'
                              }`}
                            />
                            {locFormErrors.state && (
                              <p className="text-[11px] text-red-600 font-medium mt-1">
                                {locFormErrors.state}
                              </p>
                            )}
                          </div>

                          <div>
                            <label
                              htmlFor="loc-instructions"
                              className="block text-[11px] font-bold text-slate-700 mb-1"
                            >
                              Delivery Instructions (Optional)
                            </label>
                            <input
                              id="loc-instructions"
                              type="text"
                              value={locInstructions}
                              onChange={(e) => setLocInstructions(e.target.value)}
                              placeholder="Gate pass / security desk instructions"
                              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:border-teal-600"
                            />
                          </div>

                          <label className="flex items-center gap-2.5 min-h-[40px] pt-0.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={locIsDefault}
                              onChange={(e) => setLocIsDefault(e.target.checked)}
                              className="w-4 h-4 accent-teal-600 rounded"
                            />
                            <span className="text-xs font-semibold text-slate-700">
                              Set as default delivery address ({firestoreSavedLocations.length || addresses.length} saved)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Sticky Save Address CTA */}
                      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
                        <button
                          type="button"
                          disabled={isSavingLocation}
                          onClick={() => void handleSaveDeliveryLocation()}
                          className="w-full min-h-[48px] rounded-xl bg-[#0A2540] hover:bg-[#061B2E] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          {isSavingLocation ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Saving Delivery Address...</span>
                            </>
                          ) : (
                            <span>Save Address</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal Sheet: View My Requests (ServiceRepository Stream) */}
                {isMyRequestsDrawerOpen && (
                  <div className="absolute inset-0 bg-black/50 z-40 flex items-end">
                    <div className="w-full bg-white rounded-t-3xl p-4 shadow-2xl max-h-[82%] flex flex-col">
                      <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 shrink-0">
                        <div>
                          <h3 className="font-extrabold text-sm text-[#0A2540]">
                            My Service Requests
                          </h3>
                          <p className="text-[10.5px] text-slate-500">
                            {firebaseUser
                              ? 'Synced via ServiceRepository (Cloud Firestore)'
                              : 'Session requests · Connect Google Auth for live cloud sync'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsMyRequestsDrawerOpen(false)}
                          aria-label="Close My Service Requests"
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto py-3 space-y-2">
                        {allMyServiceRequests.length === 0 ? (
                          <div className="py-8 text-center space-y-2">
                            <p className="text-xs font-bold text-[#0A2540]">
                              No Service Requests Submitted Yet
                            </p>
                            <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto">
                              Submit an Installation, Maintenance, or Repair booking on Screen 23 to
                              track it here.
                            </p>
                          </div>
                        ) : (
                          allMyServiceRequests.map((req) => {
                            const confirmed =
                              req.status === 'scheduled' || req.status === 'in_progress';
                            return (
                              <button
                                key={req.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBookingRecord(req);
                                  setIsMyRequestsDrawerOpen(false);
                                  setCurrentScreen('booking_confirmation');
                                }}
                                className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-teal-500 bg-slate-50/70 space-y-1 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="font-mono tabular-nums font-bold text-[#0A2540]">
                                    {req.ticketNumber} · {req.requestCategory}
                                  </span>
                                  <span
                                    className={`font-semibold ${
                                      confirmed ? 'text-teal-700' : 'text-amber-700'
                                    }`}
                                  >
                                    {confirmed ? 'Confirmed' : 'Unconfirmed'}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-800 truncate">
                                  {req.productModel}
                                </p>
                                <p className="text-[10.5px] font-mono tabular-nums text-slate-500">
                                  Preferred: {req.preferredDateIso}
                                  {req.preferredTimeSlot ? ` · ${req.preferredTimeSlot}` : ''}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMyRequestsDrawerOpen(false);
                            setCurrentScreen('service_booking');
                          }}
                          className="flex-1 min-h-[44px] rounded-xl bg-[#0A2540] text-white font-bold text-xs cursor-pointer"
                        >
                          New Service Booking
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal: Add / Edit Address Dialog */}
                {isAddressModalOpen && (
                  <div className="absolute inset-0 bg-black/50 z-40 flex items-end">
                    <div className="w-full bg-white rounded-t-3xl p-5 shadow-2xl max-h-[88%] overflow-y-auto space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm text-[#0A2540]">
                          {editingAddressId ? 'Edit Delivery Address' : 'Add New Address'}
                        </h3>
                        <button
                          onClick={() => setIsAddressModalOpen(false)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Tag selector */}
                      <div className="flex gap-2 text-xs">
                        {(['Home', 'Work', 'Other'] as const).map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setAddressForm({ ...addressForm, label: tag })}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                              addressForm.label === tag ? 'bg-[#0A2540] text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Recipient Full Name</label>
                          <input
                            type="text"
                            value={addressForm.recipientName}
                            onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Phone Number</label>
                          <input
                            type="text"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                            Street Address & Flat / House No.
                          </label>
                          <textarea
                            rows={2}
                            value={addressForm.streetAddress}
                            onChange={(e) => setAddressForm({ ...addressForm, streetAddress: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs resize-none"
                            placeholder="e.g. Flat 402, Green Park Avenue, Link Road"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">City</label>
                            <input
                              type="text"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">PIN / Postal Code</label>
                            <input
                              type="text"
                              value={addressForm.postalCode}
                              onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                              className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">State</label>
                          <input
                            type="text"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                            Delivery Instructions (Optional)
                          </label>
                          <input
                            type="text"
                            value={addressForm.deliveryInstructions}
                            onChange={(e) => setAddressForm({ ...addressForm, deliveryInstructions: e.target.value })}
                            placeholder="e.g. Ring bell twice, leave with security"
                            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="isDef"
                            checked={addressForm.isDefault}
                            onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                            className="w-4 h-4 accent-teal-600 rounded"
                          />
                          <label htmlFor="isDef" className="text-xs font-semibold text-slate-700 cursor-pointer">
                            Set as Default Delivery Address
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setIsAddressModalOpen(false)}
                          className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!addressForm.recipientName || !addressForm.streetAddress || !addressForm.postalCode) {
                              showToast('Please complete the recipient name, street address, and PIN code.');
                              return;
                            }

                            if (editingAddressId) {
                              setAddresses(
                                addresses.map((a) => {
                                  if (a.id === editingAddressId) {
                                    return { ...a, ...addressForm };
                                  }
                                  if (addressForm.isDefault) {
                                    return { ...a, isDefault: false };
                                  }
                                  return a;
                                })
                              );
                              showToast('Address updated successfully!');
                            } else {
                              const newAddr: AddressItem = {
                                id: 'addr-' + Date.now(),
                                userId: profile.uid,
                                ...addressForm,
                              };
                              if (addressForm.isDefault) {
                                setAddresses([newAddr, ...addresses.map((a) => ({ ...a, isDefault: false }))]);
                              } else {
                                setAddresses([...addresses, newAddr]);
                              }
                              showToast('New address saved!');
                            }
                            setIsAddressModalOpen(false);
                          }}
                          className="flex-1 py-2.5 bg-[#0A2540] text-white rounded-xl font-bold text-xs shadow-md"
                        >
                          {editingAddressId ? 'Update Address' : 'Save Address'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal: Logout Confirmation */}
                {showLogoutConfirm && (
                  <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-5 shadow-2xl max-w-xs text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                        <LogOut className="w-6 h-6" />
                      </div>
                      <h3 className="font-extrabold text-sm text-[#0A2540]">Sign Out?</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Are you sure you want to sign out from your Califnco account? Your session will be safely terminated.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (firebaseUser) {
                              await revokeWebDeviceTokenOnSignOut(firebaseUser.uid);
                              await signOut(auth);
                            }
                            setShowLogoutConfirm(false);
                            setCurrentScreen('welcome');
                            showToast('Signed out and revoked registered device push token.');
                          }}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transient Notification Toast */}
                {toastMessage && (
                  <div className="absolute top-11 left-4 right-4 z-50 bg-[#0A2540] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 border border-teal-500/30">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                    <span className="flex-1">{toastMessage}</span>
                  </div>
                )}

                {/* Android Navigation Bar */}
                <div className="h-5 flex items-center justify-center pb-2 bg-white shrink-0">
                  <div className="w-28 h-1 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>

            {/* Testbench Panel & Quick Controls */}
            <div className="w-full lg:w-96 flex flex-col gap-4">
              {/* Device Viewport Switcher */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-medium">Viewport</span>
                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  {(['pixel', 'galaxy', 'compact'] as const).map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setDeviceModel(model)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer whitespace-nowrap ${
                        deviceModel === model
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {model === 'pixel'
                        ? 'Pixel 8 Pro'
                        : model === 'galaxy'
                        ? 'Galaxy S24'
                        : '360dp'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen Navigator */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-teal-400">
                    Mobile Application Screens
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    Screens 1–18, 23–26
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 text-xs">
                  {/* Segment 11: Active */}
                  <div>
                    <div className="text-[10.5px] font-semibold text-teal-300 mb-1 flex items-center justify-between">
                      <span>Segment 11: Notifications &amp; Location</span>
                      <span className="text-[10px] text-teal-400 font-mono">Current</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('notifications')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'notifications'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[9.5px] text-teal-400 font-mono">Screen 25</div>
                        <div className="truncate text-[11px]">Notifications</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('delivery_location')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'delivery_location'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[9.5px] text-teal-400 font-mono">Screen 26</div>
                        <div className="truncate text-[11px]">Delivery Location</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 10 */}
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400 mb-1">
                      Segment 10: Service Booking
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('service_booking')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'service_booking'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 23</div>
                        <div className="truncate text-[11px]">Service Booking</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('booking_confirmation')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'booking_confirmation'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 24</div>
                        <div className="truncate text-[11px]">Confirmation</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 9 */}
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400 mb-1">
                      Segment 9: Bulk Procurement
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('bulk_order_cart')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'bulk_order_cart'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 17</div>
                        <div className="truncate text-[11px]">Bulk Cart</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('dealer_order_history')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'dealer_order_history'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 18</div>
                        <div className="truncate text-[11px]">Dealer PO History</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 8 */}
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400 mb-1">
                      Segment 8: Dealer Hub &amp; Wholesale
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('dealer_home')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'dealer_home'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 15</div>
                        <div className="truncate text-[11px]">Dealer Hub</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('wholesale_catalog')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'wholesale_catalog'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 16</div>
                        <div className="truncate text-[11px]">Wholesale Catalog</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 7 */}
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400 mb-1">
                      Segment 7: Profile &amp; Addresses
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('profile')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'profile'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 13</div>
                        <div className="truncate text-[11px]">Customer Profile</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('address_management')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'address_management'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 14</div>
                        <div className="truncate text-[11px]">Saved Addresses</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 6 */}
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400 mb-1">
                      Segment 6: Orders &amp; Tracking
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_history')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'order_history'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 11</div>
                        <div className="truncate text-[11px]">Order History</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('order_detail_view')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'order_detail_view'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 12</div>
                        <div className="truncate text-[11px]">Order Details</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 3–5 */}
                  <div>
                    <div className="text-[10.5px] font-semibold text-slate-400 mb-1">
                      Segments 1–5: Auth, Catalog &amp; Checkout
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('home')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'home'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 5</div>
                        <div className="truncate text-[11px]">Customer Home</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('catalog')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'catalog'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 6</div>
                        <div className="truncate text-[11px]">Water Catalog</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('checkout')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'checkout'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 9</div>
                        <div className="truncate text-[11px]">Checkout</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentScreen('welcome')}
                        className={`py-1.5 px-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          currentScreen === 'welcome'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-[9.5px] text-slate-500 font-mono">Screen 1</div>
                        <div className="truncate text-[11px]">Welcome / Auth</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Screens 25 & 26 Interactive Verification Scenarios */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-slate-200 mb-3">
                  Screens 25 &amp; 26 Verification Scenarios
                </h3>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isEmittingOrderEvent}
                    onClick={() => {
                      setCurrentScreen('notifications');
                      void handleEmitTrustedOrderEvent('order_dispatched');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        01. Emit Trusted Order Dispatch Event
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Writes to /notifications (Admin) &amp; shows foreground banner
                      </div>
                    </div>
                    <span className="text-[10.5px] font-mono text-teal-400 shrink-0">
                      {isEmittingOrderEvent ? 'Sending' : 'Trigger'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentScreen('notifications');
                      setSimulateEmptyInbox((prev) => !prev);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        02. Toggle Screen 25 Empty Inbox State
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Inspects clean empty state vs unread/read list
                      </div>
                    </div>
                    <span className="text-[10.5px] font-mono text-teal-400 shrink-0">
                      {simulateEmptyInbox ? 'Empty' : 'Populated'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentScreen('delivery_location');
                      const nextFallback = !manualAddressFallbackMode;
                      setManualAddressFallbackMode(nextFallback);
                      setLocationCaptureSource(nextFallback ? 'manual_only' : 'map_pin');
                      if (!nextFallback && !selectedMapPin) {
                        setSelectedMapPin(mapCenter);
                      }
                      showToast(
                        nextFallback
                          ? 'Switched Screen 26 to Manual Address Fallback (no map coordinates required).'
                          : 'Switched Screen 26 to OpenStreetMap Pin Selector.'
                      );
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        03. Toggle OpenStreetMap vs Manual Fallback
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Verifies Screen 26 saves with or without map coordinates
                      </div>
                    </div>
                    <span className="text-[10.5px] font-mono text-amber-400 shrink-0">
                      {manualAddressFallbackMode ? 'Manual' : 'OSM Pin'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Firestore & Security Rules Notes */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-1.5">
                <div className="font-semibold text-teal-400">
                  Zero-Trust FCM &amp; Location Rules
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Clients cannot forge <code>/notifications</code>; recipients may only transition{' '}
                  <code>isRead: false -&gt; true</code>. Device tokens in{' '}
                  <code>/users/&#123;uid&#125;/fcm_tokens</code> disallow listing, and{' '}
                  <code>delivery_addresses</code> enforce{' '}
                  <code>addressVerificationStatus == &apos;unverified_manual_entry&apos;</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Code Inspection Tab */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
            {/* File List */}
            <div className="w-full md:w-80 border-r border-slate-800 bg-slate-900/50 p-4 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400">Flutter Segment</div>
                <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSegmentCodeTab('segment11');
                      setSelectedCodeFile('notifications_screen.dart');
                    }}
                    className={`py-1.5 rounded font-semibold cursor-pointer whitespace-nowrap ${
                      segmentCodeTab === 'segment11'
                        ? 'bg-teal-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Seg 11 (25–26)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSegmentCodeTab('segment10');
                      setSelectedCodeFile('service_booking_screen.dart');
                    }}
                    className={`py-1.5 rounded font-semibold cursor-pointer whitespace-nowrap ${
                      segmentCodeTab === 'segment10'
                        ? 'bg-teal-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Seg 10 (23–24)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSegmentCodeTab('segment9');
                      setSelectedCodeFile('bulk_order_cart_screen.dart');
                    }}
                    className={`py-1.5 rounded font-semibold cursor-pointer whitespace-nowrap ${
                      segmentCodeTab === 'segment9'
                        ? 'bg-teal-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Seg 9 (17–18)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSegmentCodeTab('segment8');
                      setSelectedCodeFile('dealer_home_screen.dart');
                    }}
                    className={`py-1.5 rounded font-semibold cursor-pointer whitespace-nowrap ${
                      segmentCodeTab === 'segment8'
                        ? 'bg-teal-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Seg 8 (15–16)
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-300 mb-2">
                  {segmentCodeTab === 'segment11'
                    ? 'Screens 25 & 26 Dart + Backend Files'
                    : segmentCodeTab === 'segment10'
                    ? 'Screens 23 & 24 Dart Files'
                    : segmentCodeTab === 'segment9'
                    ? 'Screens 17 & 18 Dart Files'
                    : 'Screens 15 & 16 Dart Files'}
                </h3>
                <div className="space-y-1">
                  {Object.keys(flutterFiles).map((fileName) => (
                    <button
                      key={fileName}
                      type="button"
                      onClick={() => setSelectedCodeFile(fileName)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                        selectedCodeFile === fileName
                          ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{fileName}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Code Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  {flutterFiles[selectedCodeFile]?.path}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyCode(selectedCodeFile, flutterFiles[selectedCodeFile]?.content || '')
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  {copiedFile === selectedCodeFile ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="flex-1 p-6 overflow-auto font-mono text-xs text-slate-300 bg-slate-950 leading-relaxed selection:bg-teal-900 selection:text-white">
                <code>{flutterFiles[selectedCodeFile]?.content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Verification & Guide Tab */}
        {activeTab === 'instructions' && (
          <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                Califnco Full-System QA, Security &amp; Deployment Reference
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                End-to-end verification procedures for Customer E-Commerce, Dealer B2B Wholesale,
                Service Booking, FCM Notifications, OpenStreetMap Delivery Location, and Admin Operations.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <h3 className="text-sm font-semibold text-teal-400">
                01. Storefront, Cart Math &amp; Honest Payment Status Verification (Screens 2–12)
              </h3>
              <p>
                Test role-aware sign-in on <strong>Screen 2 (Login)</strong>: Customer routes to{' '}
                <strong>Home</strong>, while Dealer Partner routes directly to{' '}
                <strong>Dealer Hub</strong>. In <strong>Water Catalog (Screen 6)</strong>, filter by
                category, search by keyword, sort by price/rating, inspect specifications &amp; zoom
                studio product imagery on <strong>Screen 7</strong>, and adjust quantities in{' '}
                <strong>Cart (Screen 8)</strong>. On <strong>Checkout (Screen 9)</strong>, COD orders
                save atomically to Cloud Firestore <code>/orders</code> when signed in, while client
                Razorpay test checkouts are explicitly labeled <strong>Payment Unverified</strong>{' '}
                until a server-side <code>RAZORPAY_KEY_SECRET</code> webhook is configured.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <h3 className="text-sm font-semibold text-teal-400">
                02. Dealer Approval &amp; Service Desk Workflows (Pages 21–22 &amp; Screens 15–18, 23–24)
              </h3>
              <p>
                Pending or rejected dealers are blocked from wholesale pricing and bulk PO checkout in
                both the mobile app and <code>firestore.rules</code> (<code>isApprovedDealerUser()</code>).
                Service requests submitted on <strong>Screen 23</strong> save as{' '}
                <code>status: open</code> (unconfirmed) and only transition to a confirmed appointment
                when scheduled by an administrator on <strong>Admin Console → Service Desk (Page 22)</strong>,
                which atomically emits a trusted <code>service_scheduled</code> notification.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <h3 className="text-sm font-semibold text-teal-400">
                03. Notifications (FCM) &amp; OpenStreetMap Delivery Location (Screens 25–26)
              </h3>
              <p>
                <strong>Screen 25</strong> streams trusted <code>/notifications</code> records,
                distinguishes foreground banners from background OS tray delivery, isolates tokens in{' '}
                <code>/users/&#123;uid&#125;/fcm_tokens/&#123;deviceId&#125;</code>, and never
                fabricates push delivery. <strong>Screen 26</strong> pairs interactive OpenStreetMap
                pin selection with a full manual address fallback while keeping{' '}
                <code>addressVerificationStatus: unverified_manual_entry</code> unless verified by a
                postal backend.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs text-slate-300">
              <h3 className="text-sm font-semibold text-teal-400">
                04. Flutter Run, APK Build &amp; Security Rules Test Commands
              </h3>
              <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
{`# Run Flutter mobile app & build release Android APK
flutter pub get
flutter analyze
flutter run --dart-define=FIREBASE_DATABASE_ID=ai-studio-califnco-446b2980-82d0-4b7d-a0e2-2bbecc22b94c
flutter build apk --release --dart-define=FIREBASE_DATABASE_ID=ai-studio-califnco-446b2980-82d0-4b7d-a0e2-2bbecc22b94c

# Validate Admin React + TypeScript bundle & Firestore Security Rules
npm run lint && npm run build
npx eslint firestore.rules && npx vitest run`}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

