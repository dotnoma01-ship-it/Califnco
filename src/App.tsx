/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FLUTTER_FILES_SEGMENT_8 } from './dealerFlutterCode';
import { FLUTTER_FILES_SEGMENT_9 } from './dealerBulkOrderFlutterCode';
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
  | 'dealer_order_history';

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

export default function App() {
  const [deviceModel, setDeviceModel] = useState<'pixel' | 'galaxy' | 'compact'>('pixel');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('bulk_order_cart');
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'instructions'>('simulator');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('bulk_order_cart_screen.dart');
  const [segmentCodeTab, setSegmentCodeTab] = useState<'segment9' | 'segment8'>('segment9');

  // Segment 9: Bulk Order Cart & Dealer Order History states
  const [isSubmittingPO, setIsSubmittingPO] = useState<boolean>(false);
  const [selectedDealerOrderForDetails, setSelectedDealerOrderForDetails] = useState<DealerPurchaseOrder | null>(null);

  // Order state
  const [orders, setOrders] = useState<FullOrder[]>(SAMPLE_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<FullOrder>(SAMPLE_ORDERS[0]);
  const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
  const [activeBottomNav, setActiveBottomNav] = useState<'home' | 'catalog' | 'cart' | 'orders' | 'profile'>('profile');
  const [authRole, setAuthRole] = useState<'customer' | 'dealer'>('dealer');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [paymentChoice, setPaymentChoice] = useState<'razorpay' | 'cod'>('razorpay');
  const [cartCount, setCartCount] = useState<number>(3);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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

  const flutterFiles = segmentCodeTab === 'segment9' ? FLUTTER_FILES_SEGMENT_9 : FLUTTER_FILES_SEGMENT_8;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Studio Control */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">Califnco Flutter Studio</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-950 text-teal-400 border border-teal-800">
                Segment 9: Bulk Cart & Dealer Order History
              </span>
            </div>
            <p className="text-xs text-slate-400">Screens 17 & 18 with MOQ Validation, Commercial Freight, Idempotent PO Submission & Scoped Order History</p>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-teal-500 text-slate-950 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Android Simulator
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'code'
                ? 'bg-teal-500 text-slate-950 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Flutter Source Files
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'instructions'
                ? 'bg-teal-500 text-slate-950 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Segment 6 Guide
          </button>
        </div>

        {/* Device Dimensions Preset */}
        {activeTab === 'simulator' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Device:</span>
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setDeviceModel('pixel')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  deviceModel === 'pixel' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                }`}
              >
                Pixel 8 Pro
              </button>
              <button
                onClick={() => setDeviceModel('galaxy')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  deviceModel === 'galaxy' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                }`}
              >
                Galaxy S24
              </button>
              <button
                onClick={() => setDeviceModel('compact')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  deviceModel === 'compact' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400'
                }`}
              >
                Compact (360dp)
              </button>
            </div>
          </div>
        )}
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
                  <div className="flex-1 flex flex-col bg-white overflow-hidden p-6 justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                          <Droplets className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-sm text-[#0A2540]">CALIFNCO LOGIN</span>
                      </div>

                      <h2 className="text-lg font-black text-[#0A2540]">Welcome Back</h2>
                      <p className="text-xs text-slate-400 mb-5">Sign in to manage your orders & purifiers</p>

                      {/* Account Role Selector */}
                      <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
                        <button
                          onClick={() => setAuthRole('customer')}
                          className={`flex-1 py-1.5 rounded-lg transition-all ${
                            authRole === 'customer' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500'
                          }`}
                        >
                          Customer
                        </button>
                        <button
                          onClick={() => setAuthRole('dealer')}
                          className={`flex-1 py-1.5 rounded-lg transition-all ${
                            authRole === 'dealer' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500'
                          }`}
                        >
                          Dealer Partner
                        </button>
                      </div>

                      {/* Form Inputs */}
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:border-teal-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400 mr-2" />
                            <input
                              type="email"
                              defaultValue={authRole === 'customer' ? 'sarah.jenkins@example.com' : 'dealer@califnco.in'}
                              className="w-full bg-transparent outline-none text-slate-800 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
                          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus-within:border-teal-500">
                            <Lock className="w-3.5 h-3.5 text-slate-400 mr-2" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              defaultValue="PureWater@2026"
                              className="w-full bg-transparent outline-none text-slate-800 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-slate-400 hover:text-slate-600 text-[10px] font-semibold"
                            >
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <button
                            onClick={() => setCurrentScreen('forgot_password')}
                            className="text-[11px] font-semibold text-teal-600 hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <button
                        onClick={() => setCurrentScreen('home')}
                        className="w-full py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-md"
                      >
                        Sign In as {authRole === 'customer' ? 'Customer' : 'Dealer'}
                      </button>

                      <div className="text-center text-xs text-slate-500">
                        Don't have an account?{' '}
                        <button
                          onClick={() => setCurrentScreen('register')}
                          className="font-bold text-teal-600 hover:underline"
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
                      onClick={() => setCurrentScreen('login')}
                      className="flex items-center gap-1 text-slate-500 mb-3 hover:text-slate-800"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Login</span>
                    </button>

                    <h2 className="text-lg font-black text-[#0A2540]">Create Account</h2>
                    <p className="text-slate-400 text-[11px] mb-4">Join Califnco for certified pure water systems</p>

                    <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
                      <button
                        onClick={() => setAuthRole('customer')}
                        className={`flex-1 py-1.5 rounded-lg ${authRole === 'customer' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500'}`}
                      >
                        Customer
                      </button>
                      <button
                        onClick={() => setAuthRole('dealer')}
                        className={`flex-1 py-1.5 rounded-lg ${authRole === 'dealer' ? 'bg-white text-[#0A2540] shadow-xs' : 'text-slate-500'}`}
                      >
                        Dealer
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Full Name</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50" defaultValue="Sarah Jenkins" />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Email Address</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50" defaultValue="sarah@example.com" />
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Phone Number</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50" defaultValue="+91 98765 43210" />
                      </div>
                      {authRole === 'dealer' && (
                        <>
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10.5px] text-amber-900">
                            <strong>Notice:</strong> Dealer registration requires administrator review. Wholesale access is granted only after tax/GST verification.
                          </div>
                          <div>
                            <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">GST / Tax Number</label>
                            <input className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50" defaultValue="27AAAAA0000A1Z5" />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Password</label>
                        <input className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-slate-50" type="password" defaultValue="••••••••" />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        showToast(authRole === 'dealer' ? 'Dealer application submitted! Set to pending administrator approval.' : 'Account registered successfully!');
                        setCurrentScreen('login');
                      }}
                      className="mt-5 w-full py-2.5 bg-[#0A2540] text-white rounded-xl font-bold text-xs shadow-md"
                    >
                      Complete Registration
                    </button>
                  </div>
                )}

                {/* ================= SCREEN 4: FORGOT PASSWORD ================= */}
                {currentScreen === 'forgot_password' && (
                  <div className="flex-1 flex flex-col bg-white p-6 justify-between text-xs">
                    <div>
                      <button
                        onClick={() => setCurrentScreen('login')}
                        className="flex items-center gap-1 text-slate-500 mb-4 hover:text-slate-800"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <h2 className="text-lg font-black text-[#0A2540]">Reset Password</h2>
                      <p className="text-slate-400 text-xs mt-1 mb-4">
                        Enter your registered email address and we'll send you a password reset link.
                      </p>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        defaultValue="sarah.jenkins@example.com"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => {
                        showToast('Password reset link sent to your email!');
                        setCurrentScreen('login');
                      }}
                      className="w-full py-3 bg-[#0A2540] text-white rounded-xl font-bold text-xs"
                    >
                      Send Reset Email
                    </button>
                  </div>
                )}

                {/* ================= SCREEN 5: CUSTOMER HOME SCREEN ================= */}
                {currentScreen === 'home' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {/* Header */}
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 shrink-0 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Deliver to Mumbai 400050</p>
                        <h2 className="text-sm font-extrabold text-[#0A2540]">Hello, Sarah 👋</h2>
                      </div>
                      <button onClick={() => setCurrentScreen('cart')} className="relative p-2 rounded-xl bg-slate-50 text-slate-700">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-500 text-white text-[9px] font-black flex items-center justify-center">
                          {cartCount}
                        </span>
                      </button>
                    </div>

                    {/* Scrollable Feed */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-16">
                      {/* Search Bar */}
                      <div
                        onClick={() => setCurrentScreen('catalog')}
                        className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-slate-400 text-xs shadow-2xs cursor-pointer"
                      >
                        <Search className="w-4 h-4 text-slate-400" />
                        <span>Search purifiers, filters, pumps...</span>
                      </div>

                      {/* Promo Banner */}
                      <div className="bg-gradient-to-r from-[#0A2540] to-teal-800 text-white p-3.5 rounded-2xl shadow-sm">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-teal-500/30 text-teal-200">
                          Califnco Care Promise
                        </span>
                        <h3 className="text-sm font-black mt-1">Clean & Pure Living</h3>
                        <p className="text-[10.5px] text-teal-100 mt-0.5 leading-snug">
                          Free certified installation & 1-year RO membrane replacement warranty.
                        </p>
                      </div>

                      {/* Categories */}
                      <div className="flex gap-2 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                        {['Purifiers', 'Dispensers', 'Pumps', 'Filters', 'Spare Parts'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCurrentScreen('catalog')}
                            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-semibold text-[#0A2540] whitespace-nowrap shadow-2xs"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Featured Purifier */}
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider">Featured Flagship</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">In Stock</span>
                        </div>
                        <div className="flex gap-3 items-center">
                          <img src={IMG_PURIFIER} alt="purifier" className="w-20 h-20 rounded-xl object-cover bg-slate-100" />
                          <div className="flex-1">
                            <h4 className="font-extrabold text-xs text-[#0A2540] leading-tight">Hydra Pure Elite RO+UV+Copper</h4>
                            <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold my-1">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>4.9 (128 reviews)</span>
                            </div>
                            <span className="text-sm font-black text-[#0A2540]">₹17,499</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setCurrentScreen('details')}
                            className="flex-1 py-1.5 bg-[#0A2540] text-white rounded-xl text-xs font-bold"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              setCartCount(cartCount + 1);
                              showToast('Added Hydra Pure Elite to Cart!');
                            }}
                            className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Nav */}
                    <div className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-slate-500 shrink-0">
                      <button onClick={() => setCurrentScreen('home')} className="flex flex-col items-center gap-0.5 text-[#0A2540] font-bold">
                        <Home className="w-4 h-4" />
                        <span className="text-[10px]">Home</span>
                      </button>
                      <button onClick={() => setCurrentScreen('catalog')} className="flex flex-col items-center gap-0.5 text-slate-400">
                        <Grid className="w-4 h-4" />
                        <span className="text-[10px]">Catalog</span>
                      </button>
                      <button onClick={() => setCurrentScreen('cart')} className="flex flex-col items-center gap-0.5 text-slate-400">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Cart</span>
                      </button>
                      <button onClick={() => setCurrentScreen('order_history')} className="flex flex-col items-center gap-0.5 text-slate-400">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px]">Orders</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 6: PRODUCT CATALOG SCREEN ================= */}
                {currentScreen === 'catalog' && (
                  <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 shrink-0 flex items-center justify-between">
                      <h2 className="text-base font-extrabold text-[#0A2540]">Water Catalog</h2>
                      <span className="text-xs text-teal-600 font-bold">50+ Products</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-16">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div
                          onClick={() => setCurrentScreen('details')}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
                        >
                          <img src={IMG_PURIFIER} alt="purifier" className="w-full h-24 object-cover rounded-lg bg-slate-100 mb-2" />
                          <h4 className="font-bold text-[11px] text-[#0A2540] line-clamp-1">Hydra Pure Elite RO</h4>
                          <span className="text-xs font-black text-[#0A2540]">₹17,499</span>
                        </div>

                        <div
                          onClick={() => setCurrentScreen('details')}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
                        >
                          <img src={IMG_DISPENSER} alt="dispenser" className="w-full h-24 object-cover rounded-lg bg-slate-100 mb-2" />
                          <h4 className="font-bold text-[11px] text-[#0A2540] line-clamp-1">Aquara Dispenser</h4>
                          <span className="text-xs font-black text-[#0A2540]">₹12,499</span>
                        </div>

                        <div
                          onClick={() => setCurrentScreen('details')}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
                        >
                          <img src={IMG_FILTERS} alt="filters" className="w-full h-24 object-cover rounded-lg bg-slate-100 mb-2" />
                          <h4 className="font-bold text-[11px] text-[#0A2540] line-clamp-1">3-in-1 Filter Kit</h4>
                          <span className="text-xs font-black text-[#0A2540]">₹1,999</span>
                        </div>

                        <div
                          onClick={() => setCurrentScreen('details')}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
                        >
                          <img src={IMG_PUMP} alt="pump" className="w-full h-24 object-cover rounded-lg bg-slate-100 mb-2" />
                          <h4 className="font-bold text-[11px] text-[#0A2540] line-clamp-1">150 GPD Booster Pump</h4>
                          <span className="text-xs font-black text-[#0A2540]">₹3,499</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Nav */}
                    <div className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-slate-500 shrink-0">
                      <button onClick={() => setCurrentScreen('home')} className="flex flex-col items-center gap-0.5 text-slate-400">
                        <Home className="w-4 h-4" />
                        <span className="text-[10px]">Home</span>
                      </button>
                      <button onClick={() => setCurrentScreen('catalog')} className="flex flex-col items-center gap-0.5 text-[#0A2540] font-bold">
                        <Grid className="w-4 h-4" />
                        <span className="text-[10px]">Catalog</span>
                      </button>
                      <button onClick={() => setCurrentScreen('cart')} className="flex flex-col items-center gap-0.5 text-slate-400">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-[10px]">Cart</span>
                      </button>
                      <button onClick={() => setCurrentScreen('order_history')} className="flex flex-col items-center gap-0.5 text-slate-400">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px]">Orders</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 7: PRODUCT DETAILS SCREEN ================= */}
                {currentScreen === 'details' && (
                  <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <button onClick={() => setCurrentScreen('catalog')} className="p-1 rounded-full text-slate-600 hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <span className="font-extrabold text-xs text-[#0A2540]">Product Details</span>
                      <button onClick={() => setCurrentScreen('cart')} className="p-1 text-slate-700">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-6">
                      <div className="h-44 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative">
                        <img src={IMG_PURIFIER} alt="purifier" className="w-full h-full object-cover" />
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white rounded text-[9px] font-bold">
                          Pinch to Zoom
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Water Purifier</span>
                        <h3 className="text-base font-extrabold text-[#0A2540] leading-snug">Califnco Hydra Pure Elite RO+UV+Copper</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-black text-[#0A2540]">₹17,499</span>
                          <span className="text-xs text-slate-400 line-through">₹22,999</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">24% OFF</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <div className="font-bold text-[#0A2540] text-[11px]">Technical Specifications</div>
                        <div className="flex justify-between text-slate-500 text-[10.5px]"><span>Purification Capacity:</span><span className="font-semibold text-slate-800">10 Litres / hr</span></div>
                        <div className="flex justify-between text-slate-500 text-[10.5px]"><span>Filter Stages:</span><span className="font-semibold text-slate-800">8 Stages (RO+UV+UF+Copper)</span></div>
                        <div className="flex justify-between text-slate-500 text-[10.5px]"><span>TDS Reduction:</span><span className="font-semibold text-slate-800">Up to 2000 ppm</span></div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-200 bg-white shrink-0 flex gap-2">
                      <button
                        onClick={() => setCurrentScreen('cart')}
                        className="flex-1 py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-md"
                      >
                        Add to Cart & Checkout
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 8: SHOPPING CART SCREEN ================= */}
                {currentScreen === 'cart' && (
                  <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <h2 className="text-base font-extrabold text-[#0A2540]">Shopping Cart</h2>
                      <span className="text-xs font-bold text-teal-600">2 Items</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 pb-6">
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex gap-3 items-center">
                        <img src={IMG_PURIFIER} alt="purifier" className="w-14 h-14 rounded-xl object-cover bg-slate-100" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-[#0A2540] truncate">Hydra Pure Elite RO</h4>
                          <span className="text-xs font-black text-[#0A2540]">₹17,499</span>
                        </div>
                        <span className="text-xs font-bold text-slate-600">Qty: 1</span>
                      </div>

                      <div className="bg-white p-3 rounded-2xl border border-slate-200 flex gap-3 items-center">
                        <img src={IMG_FILTERS} alt="filters" className="w-14 h-14 rounded-xl object-cover bg-slate-100" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-[#0A2540] truncate">3-in-1 Replacement Kit</h4>
                          <span className="text-xs font-black text-[#0A2540]">₹1,999 × 2</span>
                        </div>
                        <span className="text-xs font-bold text-slate-600">Qty: 2</span>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 mt-4">
                        <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span>₹21,497</span></div>
                        <div className="flex justify-between text-emerald-600 font-bold"><span>Delivery:</span><span>FREE</span></div>
                        <div className="flex justify-between font-black text-sm text-[#0A2540] pt-2 border-t border-slate-100">
                          <span>Total Payable:</span><span>₹21,497</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                      <button
                        onClick={() => setCurrentScreen('checkout')}
                        className="w-full py-3 bg-[#0A2540] text-white rounded-xl font-bold text-xs shadow-md"
                      >
                        Proceed to Checkout (₹21,497)
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 9: CHECKOUT SCREEN ================= */}
                {currentScreen === 'checkout' && (
                  <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                    <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                      <button onClick={() => setCurrentScreen('cart')} className="p-1 rounded-full text-slate-600 hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <h2 className="text-base font-extrabold text-[#0A2540]">Checkout</h2>
                      <div className="w-5" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-6">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                        <div className="font-bold text-[#0A2540]">Delivery Address</div>
                        <p className="text-slate-700 font-semibold">Sarah Jenkins • +91 98765 43210</p>
                        <p className="text-slate-500 text-[11px]">Flat 402, Green Park Avenue, Link Road, Mumbai, 400050</p>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
                        <div className="font-bold text-[#0A2540]">Payment Method</div>
                        <button
                          onClick={() => setPaymentChoice('razorpay')}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${
                            paymentChoice === 'razorpay' ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-teal-600" />
                            <div>
                              <div className="font-bold text-[#0A2540]">Razorpay (Test Mode)</div>
                              <div className="text-[10px] text-slate-400">Cards, UPI, Netbanking (Key ID: rzp_test_*)</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">TEST</span>
                        </button>

                        <button
                          onClick={() => setPaymentChoice('cod')}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${
                            paymentChoice === 'cod' ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-slate-600" />
                            <div>
                              <div className="font-bold text-[#0A2540]">Cash on Delivery (COD)</div>
                              <div className="text-[10px] text-slate-400">Pay when certified technician installs</div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                      <button
                        onClick={() => setCurrentScreen('order_confirmation')}
                        className="w-full py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-md"
                      >
                        Place Order & Pay ₹21,497
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 10: ORDER CONFIRMATION SCREEN ================= */}
                {currentScreen === 'order_confirmation' && (
                  <div className="flex-1 flex flex-col bg-white overflow-hidden p-6 text-center justify-between">
                    <div className="pt-4 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Payment Verified
                      </span>
                      <h2 className="text-xl font-black text-[#0A2540] mt-2">Order Confirmed!</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Order Ref: <strong>#CALIF-82941</strong></p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-left space-y-1.5 my-auto">
                      <div className="flex justify-between text-slate-500 text-[11px]"><span>Paid Amount:</span><span className="font-bold text-[#0A2540]">₹21,497</span></div>
                      <div className="flex justify-between text-slate-500 text-[11px]"><span>Payment Mode:</span><span className="font-bold text-teal-600">Razorpay (rzp_test_*)</span></div>
                      <div className="flex justify-between text-slate-500 text-[11px]"><span>Delivery & Setup:</span><span className="font-bold text-slate-700">Mumbai 400050</span></div>
                      <div className="text-[10.5px] text-teal-700 font-semibold pt-1 border-t border-slate-200">
                        Estimated Delivery: Tuesday, Oct 28 with certified installation
                      </div>
                    </div>

                    <div className="space-y-2 pb-2">
                      <button
                        onClick={() => setCurrentScreen('order_detail_view')}
                        className="w-full py-3 bg-[#0A2540] text-white rounded-xl font-bold text-xs shadow-md"
                      >
                        View Order Details & Tracking
                      </button>
                      <button
                        onClick={() => setCurrentScreen('order_history')}
                        className="w-full py-2.5 bg-slate-100 text-[#0A2540] rounded-xl font-semibold text-xs"
                      >
                        Go to Order History
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= SCREEN 11: ORDER HISTORY SCREEN ================= */}
                {currentScreen === 'order_history' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
                      <h2 className="text-base font-extrabold text-[#0A2540]">Order History</h2>
                      <span className="text-xs font-bold text-teal-600">{orders.length} Orders</span>
                    </div>

                    {/* Orders List */}
                    {isOrdersLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <ShoppingBag className="w-12 h-12 text-slate-300 mb-2" />
                        <h3 className="font-bold text-sm text-slate-700">No Orders Placed Yet</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                          You haven't purchased any water purifiers or filter cartridges.
                        </p>
                        <button
                          onClick={() => setCurrentScreen('catalog')}
                          className="mt-3 px-4 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-semibold"
                        >
                          Explore Catalog
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-16">
                        {orders.map((ord) => (
                          <div
                            key={ord.id}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-extrabold text-xs text-[#0A2540]">#{ord.orderNumber}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${
                                  ord.orderStatus === 'delivered'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                                }`}
                              >
                                {ord.orderStatus}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400">{ord.createdAt}</p>

                            <div className="my-2 py-2 border-y border-slate-100 text-xs">
                              <div className="flex items-center gap-2">
                                <img
                                  src={ord.items[0]?.imageUrl || IMG_PURIFIER}
                                  alt="item"
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-[#0A2540] truncate">
                                    {ord.items[0]?.productName}
                                  </h4>
                                  <p className="text-[10px] text-slate-500">
                                    {ord.items.length > 1
                                      ? `+${ord.items.length - 1} other item(s)`
                                      : `Qty: ${ord.items[0]?.quantity}`}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-[#0A2540]">
                                    ₹{ord.totalAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{ord.paymentMethod === 'razorpay' ? 'Paid via Razorpay' : 'COD'}</span>
                              </span>

                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setCurrentScreen('order_detail_view');
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#0A2540] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <span>View Details</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Navigation */}
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
                        className="flex flex-col items-center gap-0.5 text-[#0A2540] font-bold"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[10px]">Orders</span>
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

                {/* ================= SCREEN 12: ORDER DETAIL VIEW SCREEN ================= */}
                {currentScreen === 'order_detail_view' && selectedOrder && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Bar */}
                    <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
                      <button
                        onClick={() => setCurrentScreen('order_history')}
                        className="p-1 rounded-full text-slate-600 hover:bg-slate-100"
                      >
                        <ArrowLeft className="w-5 h-5 text-[#0A2540]" />
                      </button>
                      <h2 className="text-base font-extrabold text-[#0A2540]">
                        #{selectedOrder.orderNumber}
                      </h2>
                      <div className="w-5" />
                    </div>

                    {/* Scrollable Order Inspection */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
                      {/* Fulfilment Status Card */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1.5 shadow-xs">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Order Status</span>
                          <span className="font-extrabold uppercase text-[#0A2540]">
                            {selectedOrder.orderStatus}
                          </span>
                        </div>
                        {selectedOrder.estimatedDelivery && (
                          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-bold pt-1">
                            <Truck className="w-4 h-4 text-teal-600" />
                            <span>{selectedOrder.estimatedDelivery}</span>
                          </div>
                        )}
                      </div>

                      {/* Timeline Milestones */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
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
                                      ? 'bg-teal-500 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {step.completed ? '✓' : idx + 1}
                                </div>
                                {idx < selectedOrder.timeline.length - 1 && (
                                  <div
                                    className={`w-0.5 h-6 mt-1 ${
                                      step.completed ? 'bg-teal-500' : 'bg-slate-200'
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
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2.5">
                          Purchased Purifiers & Consumables
                        </h3>
                        <div className="space-y-2 text-xs divide-y divide-slate-100">
                          {selectedOrder.items.map((item) => (
                            <div key={item.productId} className="pt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                                />
                                <div>
                                  <p className="font-bold text-[#0A2540] truncate max-w-[160px]">
                                    {item.productName}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Qty: {item.quantity} × ₹{item.unitPrice.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold text-[#0A2540]">
                                ₹{(item.quantity * item.unitPrice).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-slate-100 mt-3 pt-2 flex justify-between font-extrabold text-xs text-[#0A2540]">
                          <span>Grand Total</span>
                          <span>₹{selectedOrder.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs shadow-xs">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">
                          Destination Address
                        </h3>
                        <p className="font-bold text-[#0A2540]">{selectedOrder.deliveryAddress.name}</p>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                          {selectedOrder.deliveryAddress.address}, {selectedOrder.deliveryAddress.city} -{' '}
                          {selectedOrder.deliveryAddress.pincode}
                        </p>
                        <p className="text-slate-400 text-[11px] mt-1">
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
                            showToast('Technician Dispatch Ticket created for order #' + selectedOrder.orderNumber);
                          }}
                          className="w-full py-2.5 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs"
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

                        {/* Service Bookings Shortcut */}
                        <div
                          onClick={() =>
                            showToast(
                              'Next 6-month RO health inspection is scheduled for Dec 2026.'
                            )
                          }
                          className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-[#0A2540]">Service Bookings & Warranty</h4>
                              <p className="text-[10.5px] text-slate-400">Next RO checkup: Dec 2026</p>
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
                        onClick={() => {
                          setEditingAddressId(null);
                          setAddressForm({
                            recipientName: profile.fullName,
                            phone: profile.phone,
                            streetAddress: '',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            postalCode: '400050',
                            deliveryInstructions: '',
                            label: 'Home',
                            isDefault: addresses.length === 0,
                          });
                          setIsAddressModalOpen(true);
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        + Add
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

                    {/* Bottom CTA */}
                    <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                      <button
                        onClick={() => {
                          setEditingAddressId(null);
                          setAddressForm({
                            recipientName: profile.fullName,
                            phone: profile.phone,
                            streetAddress: '',
                            city: 'Mumbai',
                            state: 'Maharashtra',
                            postalCode: '400050',
                            deliveryInstructions: '',
                            label: 'Home',
                            isDefault: addresses.length === 0,
                          });
                          setIsAddressModalOpen(true);
                        }}
                        className="w-full py-3 bg-[#0A2540] hover:bg-[#061B2E] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Delivery Address</span>
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
                          <span className="absolute 1 top-0 right-2 w-2 h-2 rounded-full bg-teal-500" />
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
                            <span className="absolute 1 top-0 right-2 w-2 h-2 rounded-full bg-teal-500" />
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
                          onClick={() => {
                            setShowLogoutConfirm(false);
                            setCurrentScreen('welcome');
                            showToast('Signed out successfully.');
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
              {/* Screen Navigator */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                    All 16 Implemented Screens
                  </h3>
                  <span className="text-[10px] text-teal-400 font-mono font-bold">16 of 16 screens</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 text-xs">
                  {/* Segment 8 */}
                  <div>
                    <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Segment 8 (Current Segment)</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-teal-950 border border-teal-800 rounded text-teal-300">Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('dealer_home')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'dealer_home'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-teal-400">Screen 15 (New)</div>
                        <div className="truncate text-[11px]">Dealer Hub</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('wholesale_catalog')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'wholesale_catalog'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-teal-400">Screen 16 (New)</div>
                        <div className="truncate text-[11px]">Wholesale Catalog</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 7 */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Segment 7: Profile & Addresses</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('profile')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'profile'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 13</div>
                        <div className="truncate text-[11px]">Customer Profile</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('address_management')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'address_management'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 14</div>
                        <div className="truncate text-[11px]">Saved Addresses</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 6 */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Segment 6: Orders & Tracking</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('order_history')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'order_history'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 11</div>
                        <div className="truncate text-[11px]">Order History</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('order_detail_view')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'order_detail_view'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 12</div>
                        <div className="truncate text-[11px]">Order Details</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 5 */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Segment 5: Checkout & Razorpay</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('checkout')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'checkout'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 9</div>
                        <div className="truncate text-[11px]">Checkout</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('order_confirmation')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'order_confirmation'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 10</div>
                        <div className="truncate text-[11px]">Confirmation</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 4 */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Segment 4: Details & Cart</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('details')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'details'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 7</div>
                        <div className="truncate text-[11px]">Product Details</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('cart')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'cart'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 8</div>
                        <div className="truncate text-[11px]">Shopping Cart</div>
                      </button>
                    </div>
                  </div>

                  {/* Segment 3 */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Segment 3: Home & Catalog</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('home')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'home'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 5</div>
                        <div className="truncate text-[11px]">Customer Home</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('catalog')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'catalog'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 6</div>
                        <div className="truncate text-[11px]">50+ Catalog</div>
                      </button>
                    </div>
                  </div>

                  {/* Segments 1 & 2 */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Segments 1 & 2: Auth Flow</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('welcome')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'welcome'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 1</div>
                        <div className="truncate text-[11px]">Welcome</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('login')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'login'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 2</div>
                        <div className="truncate text-[11px]">Role Login</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('register')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'register'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 3</div>
                        <div className="truncate text-[11px]">Register</div>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('forgot_password')}
                        className={`py-1.5 px-2 rounded-lg border text-left transition-all ${
                          currentScreen === 'forgot_password'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="text-[9px] text-slate-500">Screen 4</div>
                        <div className="truncate text-[11px]">Forgot Pass</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Interactive Testing */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Segment 8 Interactive Tests
                  </h3>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setDealerProfile({ ...dealerProfile, approvalStatus: 'approved' });
                      setCurrentScreen('dealer_home');
                      showToast('Status: Approved Dealer (Wholesale Active)');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">1. Approved Dealer Hub</div>
                      <div className="text-[11px] text-slate-400">Shows Tier 1 partner metrics, credit & wholesale entry</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                      Approved
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setDealerProfile({ ...dealerProfile, approvalStatus: 'pending' });
                      setCurrentScreen('dealer_home');
                      showToast('Status: Approval Pending (Wholesale Locked)');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">2. Pending Approval Restriction</div>
                      <div className="text-[11px] text-slate-400">Displays compliance warning and locks wholesale catalog</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                      Pending
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setDealerProfile({ ...dealerProfile, approvalStatus: 'rejected' });
                      setCurrentScreen('dealer_home');
                      showToast('Status: Application Rejected (Access Denied)');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">3. Rejected Dealer State</div>
                      <div className="text-[11px] text-slate-400">Shows rejection notice and disables ordering privileges</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold">
                      Rejected
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setDealerProfile({ ...dealerProfile, approvalStatus: 'approved' });
                      setCurrentScreen('wholesale_catalog');
                      showToast('Opened Wholesale Catalog with Tier 1 margins.');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">4. Wholesale Catalog & MOQs</div>
                      <div className="text-[11px] text-slate-400">Tests 38%-52% margins & Minimum Order enforcement</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800 font-bold">
                      Catalog
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setDealerProfile({ ...dealerProfile, approvalStatus: 'approved' });
                      setWholesaleCart({
                        'wp-01': 10,
                        'fl-01': 40,
                        'pm-01': 20,
                      });
                      setCurrentScreen('wholesale_catalog');
                      showToast('Populated wholesale bulk order with 70 units!');
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">5. Bulk Order Line Items & PO</div>
                      <div className="text-[11px] text-slate-400">Tests wholesale cart accumulation & dynamic pricing</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-bold">
                      Bulk Order
                    </span>
                  </button>
                </div>
              </div>

              {/* Security Audit Badge */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-xs">
                <div className="flex items-center gap-2 text-teal-400 font-semibold mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security & Isolation Enforcement</span>
                </div>
                <ul className="space-y-1.5 text-slate-400 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Dealer wholesale pricing is server-authoritative in <code>dealerPrice</code> and guarded by custom claims</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Ordinary customers cannot access wholesale margins via client tampering</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Wholesale ordering privileges strictly require <code>approvalStatus == 'approved'</code></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Minimum Order Quantity (MOQ) logic is clamped at data model and UI steppers</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Code Inspection Tab */}
        {activeTab === 'code' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
            {/* File List */}
            <div className="w-full md:w-72 border-r border-slate-800 bg-slate-900/50 p-4 overflow-y-auto">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Segment 8 Files
              </h3>
              <div className="space-y-1">
                {Object.keys(flutterFiles).map((fileName) => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedCodeFile(fileName)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
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

            {/* Code Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  {flutterFiles[selectedCodeFile]?.path}
                </span>
                <button
                  onClick={() =>
                    copyCode(selectedCodeFile, flutterFiles[selectedCodeFile]?.content || '')
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
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
          <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-2">Segment 8 Dealer Dashboard & Wholesale Catalog Guide</h2>
            <p className="text-sm text-slate-400 mb-6">
              Instructions for verifying Screen 15 (Dealer Home) and Screen 16 (Wholesale Catalog).
            </p>

            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">1. Server-Authoritative Wholesale Pricing & Security Rules</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Both retail and wholesale pricing are defined on the unified <code>Product</code> model (<code>retailPrice</code> and <code>dealerPrice</code>). However, wholesale margins and bulk ordering privileges are strictly gated on the backend by verifying both the user's role and their administrative approval status:
                </p>
                <div className="bg-slate-900 p-3 rounded-xl font-mono text-xs text-slate-300 mt-2 space-y-1">
                  <div>// Firestore Security Rules for Wholesale Catalog</div>
                  <div>match /dealers/{`{dealerId}`} &#123;</div>
                  <div className="pl-4">allow read: if request.auth != null && (request.auth.uid == dealerId || request.auth.token.role == 'admin');</div>
                  <div className="pl-4">allow write: if request.auth != null && request.auth.token.role == 'admin'; // Only admin can approve dealers</div>
                  <div>&#125;</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">2. Minimum Order Quantity (MOQ) Clamping</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every product category enforces a Minimum Order Quantity (Water Purifiers: MOQ 5; Dispensers: MOQ 3; Filters: MOQ 20; Booster Pumps: MOQ 10). The quantity stepper does not allow values below MOQ, ensuring wholesale economics are respected at all times.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-teal-400 mb-2">3. Completed Califnco Application Screens</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-teal-950/40 border border-teal-800/60 rounded-xl">
                    <div className="font-semibold text-teal-300">Completed (Segments 1–8):</div>
                    <ul className="mt-1.5 space-y-1 text-slate-300 text-[11px]">
                      <li>• Screen 1: Welcome / Onboarding</li>
                      <li>• Screen 2: Role-Based Login Screen</li>
                      <li>• Screen 3: Registration Screen</li>
                      <li>• Screen 4: Forgot Password Screen</li>
                      <li>• Screen 5: Customer Home Screen</li>
                      <li>• Screen 6: Product Catalog Screen (50+ items)</li>
                      <li>• Screen 7: Product Details Screen</li>
                      <li>• Screen 8: Shopping Cart Screen</li>
                      <li>• Screen 9: Checkout Screen (Razorpay Test Mode)</li>
                      <li>• Screen 10: Order Confirmation Screen</li>
                      <li>• Screen 11: Order History Screen</li>
                      <li>• Screen 12: Order Details & Fulfilment Tracking</li>
                      <li>• Screen 13: Customer Profile Screen</li>
                      <li>• Screen 14: Address Management Screen</li>
                      <li>• Screen 15: Dealer Home Dashboard (Current)</li>
                      <li>• Screen 16: Wholesale Catalog & MOQs (Current)</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <div className="font-semibold text-slate-400">Architecture & Roles:</div>
                    <ul className="mt-1.5 space-y-1 text-slate-400 text-[11px]">
                      <li>• Customer Role: Retail pricing & personal orders</li>
                      <li>• Dealer Role: Wholesale Tier 1 margins & MOQs</li>
                      <li>• Admin Gate: Gated approval required for trade access</li>
                      <li>• State: flutter_bloc with Cubits</li>
                      <li>• Navigation: go_router with role auth redirects</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
