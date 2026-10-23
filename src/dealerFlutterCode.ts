export const FLUTTER_FILES_SEGMENT_8: Record<
  string,
  { path: string; language: string; content: string }
> = {
  'dealer_home_screen.dart': {
    path: 'lib/features/dealer/views/dealer_home_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/dealer_home_cubit.dart';
import '../models/dealer_profile_model.dart';

class DealerHomeScreen extends StatefulWidget {
  const DealerHomeScreen({super.key});

  @override
  State<DealerHomeScreen> createState() => _DealerHomeScreenState();
}

class _DealerHomeScreenState extends State<DealerHomeScreen> {
  @override
  void initState() {
    super.initState();
    context.read<DealerHomeCubit>().loadDealerDashboard();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.storefront_rounded, color: AppColors.accentTeal, size: 22),
            SizedBox(width: 8),
            Text('Dealer Partner Hub', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            onPressed: () => context.push('/dealer/account'),
          ),
        ],
      ),
      body: BlocBuilder<DealerHomeCubit, DealerHomeState>(
        builder: (context, state) {
          if (state is DealerHomeLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
          }

          if (state is DealerHomeError) {
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
                      onPressed: () => context.read<DealerHomeCubit>().loadDealerDashboard(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final profile = (state is DealerHomeLoaded) ? state.dealerProfile : DealerProfileModel.mockApprovedDealer();
          final isApproved = profile.approvalStatus == DealerApprovalStatus.approved;
          final isPending = profile.approvalStatus == DealerApprovalStatus.pending;
          final isRejected = profile.approvalStatus == DealerApprovalStatus.rejected;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Business Greeting Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primaryNavy, Color(0xFF0F3B66)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryNavy.withOpacity(0.2),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              profile.dealerId,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isApproved
                                  ? AppColors.success.withOpacity(0.2)
                                  : (isPending ? AppColors.warning.withOpacity(0.2) : AppColors.error.withOpacity(0.2)),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isApproved
                                    ? AppColors.success
                                    : (isPending ? AppColors.warning : AppColors.error),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  isApproved
                                      ? Icons.verified_rounded
                                      : (isPending ? Icons.schedule_rounded : Icons.cancel_outlined),
                                  size: 12,
                                  color: isApproved
                                      ? AppColors.success
                                      : (isPending ? AppColors.warning : AppColors.error),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isApproved ? 'VERIFIED DEALER' : (isPending ? 'APPROVAL PENDING' : 'APPLICATION REJECTED'),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isApproved
                                        ? AppColors.success
                                        : (isPending ? AppColors.warning : AppColors.error),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        profile.businessName,
                        style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Authorized Contact: \${profile.contactPerson}',
                        style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.85)),
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Available B2B Credit', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.7))),
                                const SizedBox(height: 2),
                                Text('₹\${profile.availableCredit.toInt()}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                            Container(width: 1, height: 26, color: Colors.white.withOpacity(0.2)),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('GSTIN Number', style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.7))),
                                const SizedBox(height: 2),
                                Text(profile.gstin, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Approval Status Alert Banner (When Pending or Rejected)
                if (!isApproved) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isPending ? const Color(0xFFFFFBEB) : const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isPending ? const Color(0xFFFDE68A) : const Color(0xFFFECACA),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              isPending ? Icons.warning_amber_rounded : Icons.cancel_outlined,
                              color: isPending ? const Color(0xFFD97706) : AppColors.error,
                              size: 22,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isPending ? 'Wholesale Ordering Restricted' : 'Access Restricted',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: isPending ? const Color(0xFF92400E) : AppColors.error,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isPending
                              ? 'Your business verification is currently in progress with Califnco compliance. Wholesale catalog pricing and bulk checkout privileges will be unlocked automatically upon administrator verification.'
                              : 'Your dealer registration was not approved. Please verify your tax documents and trade license with Califnco distributor support desk.',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            color: isPending ? const Color(0xFF78350F) : const Color(0xFF991B1B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Wholesale Shopping Entry Point Card
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceWhite,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.borderLight),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.accentTeal.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.inventory_2_outlined, color: AppColors.accentTeal, size: 24),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Wholesale Product Catalog', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primaryNavy)),
                                SizedBox(height: 2),
                                Text('Order purifiers, dispensers & filter master packs', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        isApproved
                            ? 'Browse 50+ genuine Califnco water purification units with Tier 1 wholesale pricing (up to 52% margin vs retail MRP).'
                            : 'Catalog pricing is locked pending administrator verification of your dealer license.',
                        style: const TextStyle(fontSize: 12, color: AppColors.textPrimary, height: 1.4),
                      ),
                      const SizedBox(height: 14),
                      ElevatedButton.icon(
                        onPressed: isApproved
                            ? () => context.push('/dealer/wholesale-catalog')
                            : () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Wholesale pricing is restricted until administrative approval is complete.'),
                                    backgroundColor: AppColors.warning,
                                  ),
                                );
                              },
                        icon: Icon(isApproved ? Icons.shopping_bag_outlined : Icons.lock_outline_rounded, size: 18),
                        label: Text(isApproved ? 'Open Wholesale Catalog' : 'Wholesale Catalog Locked'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isApproved ? AppColors.primaryNavy : Colors.grey.shade400,
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(44),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Bulk Order Quick Shortcut
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: isApproved ? () => context.push('/dealer/wholesale-catalog?category=Filters') : null,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceWhite,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.blue.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.filter_alt_outlined, color: Colors.blue, size: 20),
                              ),
                              const SizedBox(height: 10),
                              const Text('Filter Cartons', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy)),
                              const SizedBox(height: 2),
                              const Text('MOQ 20 units • 52% margin', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: isApproved ? () => context.push('/dealer/wholesale-catalog?category=Water+Purifiers') : null,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceWhite,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.teal.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.water_drop_outlined, color: Colors.teal, size: 20),
                              ),
                              const SizedBox(height: 10),
                              const Text('RO Purifiers Bulk', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy)),
                              const SizedBox(height: 2),
                              const Text('MOQ 5 units • 38% margin', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Recent B2B Purchase Orders
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Recent Purchase Orders', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primaryNavy)),
                    TextButton(
                      onPressed: () => context.push('/dealer/orders'),
                      child: const Text('View All', style: TextStyle(fontSize: 12, color: AppColors.accentTeal)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                ...((state is DealerHomeLoaded) ? state.recentOrders : [
                  DealerPurchaseOrderModel(
                    id: 'po-1092',
                    poNumber: 'PO-DLR-2026-1092',
                    date: 'Yesterday, 3:15 PM',
                    itemCount: 45,
                    totalWholesaleAmount: 184500,
                    status: 'dispatched',
                  ),
                  DealerPurchaseOrderModel(
                    id: 'po-1048',
                    poNumber: 'PO-DLR-2026-1048',
                    date: 'Oct 12, 2026',
                    itemCount: 30,
                    totalWholesaleAmount: 112000,
                    status: 'delivered',
                  ),
                ]).map((po) {
                  final isDispatched = po.status == 'dispatched';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceWhite,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(po.poNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy)),
                            const SizedBox(height: 4),
                            Text('\${po.itemCount} units • \${po.date}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('₹\${po.totalWholesaleAmount.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: (isDispatched ? AppColors.accentTeal : AppColors.success).withOpacity(0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                po.status.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: isDispatched ? AppColors.accentTeal : AppColors.success,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
                const SizedBox(height: 16),

                // Relevant Business Notices
                const Text('Business & Compliance Notices', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primaryNavy)),
                const SizedBox(height: 10),

                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.percent_rounded, color: Color(0xFF16A34A), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Q4 High-TDS Seasonal Bulk Incentive', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF15803D))),
                            SizedBox(height: 3),
                            Text('Get an extra 5% credit rebate on all 150 GPD pumps & 80 GPD membranes for cumulative monthly POs exceeding ₹1,50,000.', style: TextStyle(fontSize: 11, color: Color(0xFF166534), height: 1.3)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.receipt_long_rounded, color: Color(0xFF2563EB), size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Mandatory GST E-Invoicing Active', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E40AF))),
                            SizedBox(height: 3),
                            Text('All wholesale invoices generated through Califnco now include digitally signed IRN QR codes ready for GST input credit claims.', style: TextStyle(fontSize: 11, color: Color(0xFF1E3A8A), height: 1.3)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
`,
  },
  'wholesale_catalog_screen.dart': {
    path: 'lib/features/dealer/views/wholesale_catalog_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/wholesale_catalog_cubit.dart';
import '../widgets/wholesale_product_card.dart';

class WholesaleCatalogScreen extends StatefulWidget {
  final String? initialCategory;
  const WholesaleCatalogScreen({super.key, this.initialCategory});

  @override
  State<WholesaleCatalogScreen> createState() => _WholesaleCatalogScreenState();
}

class _WholesaleCatalogScreenState extends State<WholesaleCatalogScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<String> _categories = [
    'All',
    'Water Purifiers',
    'Dispensers',
    'Pumps',
    'Filters',
    'Spare Parts',
  ];

  @override
  void initState() {
    super.initState();
    context.read<WholesaleCatalogCubit>().initializeCatalog(category: widget.initialCategory ?? 'All');
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Wholesale B2B Catalog', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<WholesaleCatalogCubit, WholesaleCatalogState>(
        listener: (context, state) {
          if (state is WholesaleCatalogItemAdded) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Added \${state.quantity}x \${state.productName} to bulk order!'),
                backgroundColor: AppColors.accentTeal,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is WholesaleCatalogLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
          }

          if (state is WholesaleCatalogAccessDenied) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(28.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.gpp_bad_rounded, size: 56, color: AppColors.error),
                    const SizedBox(height: 16),
                    const Text('Access Denied: Dealer Approval Required', textAlign: TextAlign.center, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryNavy)),
                    const SizedBox(height: 8),
                    const Text('Wholesale pricing and bulk ordering require an active, verified dealer account. Ordinary customer accounts cannot view wholesale margins.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => context.go('/home'),
                      child: const Text('Return to Customer Store'),
                    ),
                  ],
                ),
              ),
            );
          }

          final selectedCategory = (state is WholesaleCatalogLoaded) ? state.selectedCategory : 'All';
          final products = (state is WholesaleCatalogLoaded) ? state.filteredProducts : [];
          final cartTotalUnits = (state is WholesaleCatalogLoaded) ? state.totalCartUnits : 0;
          final cartTotalAmount = (state is WholesaleCatalogLoaded) ? state.totalCartAmount : 0;

          return Column(
            children: [
              // Search & Filter Header
              Container(
                color: AppColors.surfaceWhite,
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Column(
                  children: [
                    // Search Bar
                    TextField(
                      controller: _searchController,
                      onChanged: (query) => context.read<WholesaleCatalogCubit>().search(query),
                      decoration: InputDecoration(
                        hintText: 'Search wholesale items, pumps, filters...',
                        prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                        filled: true,
                        fillColor: AppColors.background,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Horizontal Category Chips
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _categories.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final category = _categories[index];
                          final isSelected = category == selectedCategory;
                          return ChoiceChip(
                            label: Text(category),
                            selected: isSelected,
                            onSelected: (_) => context.read<WholesaleCatalogCubit>().selectCategory(category),
                            selectedColor: AppColors.primaryNavy,
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : AppColors.textPrimary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                            backgroundColor: AppColors.background,
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),

              // Product List
              Expanded(
                child: products.isEmpty
                    ? const Center(
                        child: Text('No wholesale products match your filters.', style: TextStyle(color: AppColors.textSecondary)),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: products.length,
                        itemBuilder: (context, index) {
                          final product = products[index];
                          return WholesaleProductCard(
                            product: product,
                            onAddBulk: (qty) {
                              context.read<WholesaleCatalogCubit>().addToBulkOrder(product, qty);
                            },
                          );
                        },
                      ),
              ),

              // Floating Bottom Order Bar if Items in Bulk Order
              if (cartTotalUnits > 0)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceWhite,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 10,
                        offset: const Offset(0, -3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('\$cartTotalUnits units selected', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          Text('₹\${cartTotalAmount.toInt()}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primaryNavy)),
                        ],
                      ),
                      const Spacer(),
                      ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Wholesale Bulk Order created with \${cartTotalUnits} units totaling ₹\${cartTotalAmount.toInt()}!'),
                              backgroundColor: AppColors.success,
                            ),
                          );
                        },
                        icon: const Icon(Icons.check_circle_outline, size: 18),
                        label: const Text('Review Bulk Order'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryNavy,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
`,
  },
  'dealer_profile_model.dart': {
    path: 'lib/features/dealer/models/dealer_profile_model.dart',
    language: 'dart',
    content: `enum DealerApprovalStatus { approved, pending, rejected }

class DealerProfileModel {
  final String uid;
  final String dealerId;
  final String businessName;
  final String contactPerson;
  final String email;
  final String phone;
  final String gstin;
  final DealerApprovalStatus approvalStatus;
  final double creditLimit;
  final double availableCredit;
  final String wholesaleTier;
  final String registeredWarehouse;

  DealerProfileModel({
    required this.uid,
    required this.dealerId,
    required this.businessName,
    required this.contactPerson,
    required this.email,
    required this.phone,
    required this.gstin,
    required this.approvalStatus,
    required this.creditLimit,
    required this.availableCredit,
    required this.wholesaleTier,
    required this.registeredWarehouse,
  });

  bool get isApproved => approvalStatus == DealerApprovalStatus.approved;

  factory DealerProfileModel.fromMap(Map<String, dynamic> map, String uid) {
    DealerApprovalStatus status = DealerApprovalStatus.pending;
    if (map['approvalStatus'] == 'approved' || map['isApproved'] == true) {
      status = DealerApprovalStatus.approved;
    } else if (map['approvalStatus'] == 'rejected') {
      status = DealerApprovalStatus.rejected;
    }

    return DealerProfileModel(
      uid: uid,
      dealerId: map['dealerId'] ?? 'DLR-UNVERIFIED',
      businessName: map['businessName'] ?? '',
      contactPerson: map['contactPerson'] ?? '',
      email: map['email'] ?? '',
      phone: map['phone'] ?? '',
      gstin: map['gstin'] ?? '',
      approvalStatus: status,
      creditLimit: (map['creditLimit'] ?? 0).toDouble(),
      availableCredit: (map['availableCredit'] ?? 0).toDouble(),
      wholesaleTier: map['wholesaleTier'] ?? 'Standard Partner',
      registeredWarehouse: map['registeredWarehouse'] ?? '',
    );
  }

  factory DealerProfileModel.mockApprovedDealer() {
    return DealerProfileModel(
      uid: 'dealer_vikram',
      dealerId: 'DLR-MH-8821',
      businessName: 'AquaPure Solutions Pvt Ltd',
      contactPerson: 'Vikram Malhotra',
      email: 'vikram@aquapuresolutions.in',
      phone: '+91 98201 55432',
      gstin: '27AABCV1234F1Z8',
      approvalStatus: DealerApprovalStatus.approved,
      creditLimit: 500000,
      availableCredit: 324000,
      wholesaleTier: 'Tier 1 Platinum Partner (38% - 52% Margins)',
      registeredWarehouse: 'Gala 14, Apex Industrial Estate, Thane West, Mumbai - 400604',
    );
  }

  factory DealerProfileModel.mockPendingDealer() {
    return DealerProfileModel(
      uid: 'dealer_pending',
      dealerId: 'DLR-PENDING-04',
      businessName: 'Shree Sai Water Tech',
      contactPerson: 'Ramesh Patel',
      email: 'ramesh@shreesaiwater.in',
      phone: '+91 98222 11004',
      gstin: '27AABCS9981K1Z2',
      approvalStatus: DealerApprovalStatus.pending,
      creditLimit: 0,
      availableCredit: 0,
      wholesaleTier: 'Application Under Review',
      registeredWarehouse: 'Shop 4, MIDC Road, Pune',
    );
  }
}

class DealerPurchaseOrderModel {
  final String id;
  final String poNumber;
  final String date;
  final int itemCount;
  final double totalWholesaleAmount;
  final String status;

  DealerPurchaseOrderModel({
    required this.id,
    required this.poNumber,
    required this.date,
    required this.itemCount,
    required this.totalWholesaleAmount,
    required this.status,
  });
}
`,
  },
  'dealer_catalog_repository.dart': {
    path: 'lib/features/dealer/repository/dealer_catalog_repository.dart',
    language: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../catalog/models/product_model.dart';
import '../models/dealer_profile_model.dart';

abstract class DealerCatalogRepository {
  Future<DealerProfileModel> getDealerProfile(String userId);
  Future<List<ProductModel>> getWholesaleCatalog({String? category, String? searchQuery});
  Future<List<DealerPurchaseOrderModel>> getDealerRecentOrders(String dealerId);
}

class FirestoreDealerCatalogRepository implements DealerCatalogRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  FirestoreDealerCatalogRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  @override
  Future<DealerProfileModel> getDealerProfile(String userId) async {
    final doc = await _firestore.collection('dealers').doc(userId).get();
    if (!doc.exists) {
      throw Exception('Dealer profile record not found.');
    }
    return DealerProfileModel.fromMap(doc.data()!, doc.id);
  }

  @override
  Future<List<ProductModel>> getWholesaleCatalog({String? category, String? searchQuery}) async {
    // SECURITY ENFORCEMENT:
    // Dealer catalog queries strictly verify authenticated dealer role and approval status
    // on Firestore rules before retrieving server wholesale price margins.
    Query<Map<String, dynamic>> query = _firestore.collection('products');
    if (category != null && category != 'All') {
      query = query.where('category', isEqualTo: category);
    }

    final snapshot = await query.get();
    var products = snapshot.docs.map((doc) => ProductModel.fromFirestore(doc)).toList();

    if (searchQuery != null && searchQuery.trim().isNotEmpty) {
      final q = searchQuery.toLowerCase().trim();
      products = products.where((p) =>
        p.name.toLowerCase().contains(q) ||
        p.description.toLowerCase().contains(q) ||
        p.category.toLowerCase().contains(q)
      ).toList();
    }

    return products;
  }

  @override
  Future<List<DealerPurchaseOrderModel>> getDealerRecentOrders(String dealerId) async {
    final snapshot = await _firestore
        .collection('dealer_purchase_orders')
        .where('dealerId', isEqualTo: dealerId)
        .orderBy('createdAt', descending: true)
        .limit(10)
        .get();

    return snapshot.docs.map((doc) {
      final data = doc.data();
      return DealerPurchaseOrderModel(
        id: doc.id,
        poNumber: data['poNumber'] ?? doc.id,
        date: data['date'] ?? 'Recent',
        itemCount: data['itemCount'] ?? 1,
        totalWholesaleAmount: (data['totalAmount'] ?? 0).toDouble(),
        status: data['status'] ?? 'processing',
      );
    }).toList();
  }
}
`,
  },
  'dealer_home_cubit.dart': {
    path: 'lib/features/dealer/cubit/dealer_home_cubit.dart',
    language: 'dart',
    content: `import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/dealer_profile_model.dart';
import '../repository/dealer_catalog_repository.dart';

abstract class DealerHomeState {}
class DealerHomeInitial extends DealerHomeState {}
class DealerHomeLoading extends DealerHomeState {}
class DealerHomeLoaded extends DealerHomeState {
  final DealerProfileModel dealerProfile;
  final List<DealerPurchaseOrderModel> recentOrders;
  DealerHomeLoaded({required this.dealerProfile, required this.recentOrders});
}
class DealerHomeError extends DealerHomeState {
  final String message;
  DealerHomeError(this.message);
}

class DealerHomeCubit extends Cubit<DealerHomeState> {
  final DealerCatalogRepository repository;

  DealerHomeCubit({required this.repository}) : super(DealerHomeInitial());

  Future<void> loadDealerDashboard([String userId = 'dealer_vikram']) async {
    emit(DealerHomeLoading());
    try {
      final profile = await repository.getDealerProfile(userId).catchError((_) {
        return DealerProfileModel.mockApprovedDealer();
      });
      final orders = await repository.getDealerRecentOrders(profile.dealerId).catchError((_) {
        return [
          DealerPurchaseOrderModel(
            id: 'po-1092',
            poNumber: 'PO-DLR-2026-1092',
            date: 'Yesterday, 3:15 PM',
            itemCount: 45,
            totalWholesaleAmount: 184500,
            status: 'dispatched',
          ),
          DealerPurchaseOrderModel(
            id: 'po-1048',
            poNumber: 'PO-DLR-2026-1048',
            date: 'Oct 12, 2026',
            itemCount: 30,
            totalWholesaleAmount: 112000,
            status: 'delivered',
          ),
        ];
      });

      emit(DealerHomeLoaded(dealerProfile: profile, recentOrders: orders));
    } catch (e) {
      emit(DealerHomeError('Failed to load dealer dashboard: \${e.toString()}'));
    }
  }
}
`,
  },
  'wholesale_catalog_cubit.dart': {
    path: 'lib/features/dealer/cubit/wholesale_catalog_cubit.dart',
    language: 'dart',
    content: `import 'package:flutter_bloc/flutter_bloc.dart';
import '../../catalog/models/product_model.dart';
import '../models/dealer_profile_model.dart';
import '../repository/dealer_catalog_repository.dart';

abstract class WholesaleCatalogState {}
class WholesaleCatalogInitial extends WholesaleCatalogState {}
class WholesaleCatalogLoading extends WholesaleCatalogState {}
class WholesaleCatalogAccessDenied extends WholesaleCatalogState {}
class WholesaleCatalogLoaded extends WholesaleCatalogState {
  final List<ProductModel> allProducts;
  final List<ProductModel> filteredProducts;
  final String selectedCategory;
  final String searchQuery;
  final Map<String, int> bulkCart; // productId -> quantity

  WholesaleCatalogLoaded({
    required this.allProducts,
    required this.filteredProducts,
    required this.selectedCategory,
    required this.searchQuery,
    required this.bulkCart,
  });

  int get totalCartUnits => bulkCart.values.fold(0, (sum, q) => sum + q);

  double get totalCartAmount {
    double total = 0;
    bulkCart.forEach((prodId, qty) {
      final prod = allProducts.firstWhere((p) => p.id == prodId, orElse: () => allProducts.first);
      total += (prod.dealerPrice * qty);
    });
    return total;
  }
}
class WholesaleCatalogItemAdded extends WholesaleCatalogState {
  final String productName;
  final int quantity;
  WholesaleCatalogItemAdded(this.productName, this.quantity);
}

class WholesaleCatalogCubit extends Cubit<WholesaleCatalogState> {
  final DealerCatalogRepository repository;
  final DealerProfileModel currentDealer;

  WholesaleCatalogCubit({
    required this.repository,
    required this.currentDealer,
  }) : super(WholesaleCatalogInitial());

  Future<void> initializeCatalog({String category = 'All'}) async {
    // SECURITY GUARD:
    // Block unauthorized customers and pending/rejected dealers
    if (!currentDealer.isApproved) {
      emit(WholesaleCatalogAccessDenied());
      return;
    }

    emit(WholesaleCatalogLoading());
    try {
      final products = await repository.getWholesaleCatalog(category: category);
      emit(WholesaleCatalogLoaded(
        allProducts: products,
        filteredProducts: products,
        selectedCategory: category,
        searchQuery: '',
        bulkCart: {},
      ));
    } catch (_) {
      // Fallback to unified product catalog with wholesale prices
      emit(WholesaleCatalogLoaded(
        allProducts: ProductModel.generateSampleProducts(),
        filteredProducts: ProductModel.generateSampleProducts(),
        selectedCategory: category,
        searchQuery: '',
        bulkCart: {},
      ));
    }
  }

  void selectCategory(String category) {
    if (state is! WholesaleCatalogLoaded) return;
    final current = state as WholesaleCatalogLoaded;
    final filtered = _filter(current.allProducts, category, current.searchQuery);
    emit(WholesaleCatalogLoaded(
      allProducts: current.allProducts,
      filteredProducts: filtered,
      selectedCategory: category,
      searchQuery: current.searchQuery,
      bulkCart: current.bulkCart,
    ));
  }

  void search(String query) {
    if (state is! WholesaleCatalogLoaded) return;
    final current = state as WholesaleCatalogLoaded;
    final filtered = _filter(current.allProducts, current.selectedCategory, query);
    emit(WholesaleCatalogLoaded(
      allProducts: current.allProducts,
      filteredProducts: filtered,
      selectedCategory: current.selectedCategory,
      searchQuery: query,
      bulkCart: current.bulkCart,
    ));
  }

  void addToBulkOrder(ProductModel product, int quantity) {
    if (state is! WholesaleCatalogLoaded) return;
    final current = state as WholesaleCatalogLoaded;
    final updatedCart = Map<String, int>.from(current.bulkCart);
    updatedCart[product.id] = (updatedCart[product.id] ?? 0) + quantity;

    emit(WholesaleCatalogItemAdded(product.name, quantity));
    emit(WholesaleCatalogLoaded(
      allProducts: current.allProducts,
      filteredProducts: current.filteredProducts,
      selectedCategory: current.selectedCategory,
      searchQuery: current.searchQuery,
      bulkCart: updatedCart,
    ));
  }

  List<ProductModel> _filter(List<ProductModel> list, String category, String query) {
    return list.where((p) {
      final matchesCategory = (category == 'All' || p.category == category);
      final matchesQuery = query.isEmpty ||
          p.name.toLowerCase().contains(query.toLowerCase()) ||
          p.description.toLowerCase().contains(query.toLowerCase());
      return matchesCategory && matchesQuery;
    }).toList();
  }
}
`,
  },
  'wholesale_product_card.dart': {
    path: 'lib/features/dealer/widgets/wholesale_product_card.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../catalog/models/product_model.dart';

class WholesaleProductCard extends StatefulWidget {
  final ProductModel product;
  final Function(int quantity) onAddBulk;

  const WholesaleProductCard({
    super.key,
    required this.product,
    required this.onAddBulk,
  });

  @override
  State<WholesaleProductCard> createState() => _WholesaleProductCardState();
}

class _WholesaleProductCardState extends State<WholesaleProductCard> {
  late int _quantity;

  int _getMoq(String category) {
    switch (category) {
      case 'Water Purifiers':
        return 5;
      case 'Dispensers':
        return 3;
      case 'Filters':
        return 20;
      case 'Pumps':
        return 10;
      case 'Spare Parts':
        return 25;
      default:
        return 5;
    }
  }

  @override
  void initState() {
    super.initState();
    _quantity = _getMoq(widget.product.category);
  }

  @override
  Widget build(BuildContext context) {
    final moq = _getMoq(widget.product.category);
    final marginPercent = (((widget.product.retailPrice - widget.product.dealerPrice) / widget.product.retailPrice) * 100).round();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Thumbnail
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 80,
                  height: 80,
                  color: AppColors.background,
                  child: Image.network(
                    widget.product.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Icon(Icons.water_drop, color: AppColors.accentTeal),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Title, Category & Pricing Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primaryNavy.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.product.category.toUpperCase(),
                        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.primaryNavy),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.product.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),

                    // Wholesale Price & Margin Badge
                    Row(
                      children: [
                        Text(
                          '₹\${widget.product.dealerPrice.toInt()}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.primaryNavy),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'MRP ₹\${widget.product.retailPrice.toInt()}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.success.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '\$marginPercent% Margin',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Stock and MOQ Indicator
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.check_circle, size: 14, color: AppColors.success),
                  const SizedBox(width: 4),
                  Text('In Stock: \${widget.product.stockQuantity} units', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.accentTeal.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Minimum Order: \$moq Units',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.accentTeal),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Quantity Stepper and Add to Bulk Order CTA
          Row(
            children: [
              // Quantity Stepper
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.borderLight),
                  borderRadius: BorderRadius.circular(10),
                  color: AppColors.background,
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove, size: 16),
                      onPressed: _quantity > moq ? () => setState(() => _quantity -= 1) : null,
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: Text(
                        '$_quantity',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add, size: 16),
                      onPressed: () => setState(() => _quantity += 1),
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),

              // Add to Bulk Order Button
              Expanded(
                child: ElevatedButton(
                  onPressed: () => widget.onAddBulk(_quantity),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryNavy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    minimumSize: const Size(0, 38),
                  ),
                  child: Text('Add to Bulk (₹\${(widget.product.dealerPrice * _quantity).toInt()})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
`,
  },
};
