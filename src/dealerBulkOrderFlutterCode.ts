export const FLUTTER_FILES_SEGMENT_9: Record<
  string,
  { path: string; language: string; content: string }
> = {
  'bulk_order_cart_screen.dart': {
    path: 'lib/features/dealer/views/bulk_order_cart_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/bulk_order_cart_cubit.dart';
import '../models/dealer_bulk_order_model.dart';
import '../models/dealer_profile_model.dart';

class BulkOrderCartScreen extends StatelessWidget {
  const BulkOrderCartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bulk Order Cart', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            Text('Wholesale Commercial Procurement', style: TextStyle(fontSize: 11, color: AppColors.accentTeal)),
          ],
        ),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Clear Cart',
            icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.textSecondary),
            onPressed: () => _confirmClearCart(context),
          ),
        ],
      ),
      body: BlocConsumer<BulkOrderCartCubit, BulkOrderCartState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: AppColors.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
            context.read<BulkOrderCartCubit>().clearError();
          }

          if (state.submittedOrder != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('PO \${state.submittedOrder!.poNumber} submitted successfully!'),
                backgroundColor: AppColors.success,
                behavior: SnackBarBehavior.floating,
              ),
            );
            // Navigate to Screen 18 Dealer Order History
            context.pushReplacement('/dealer/orders');
          }
        },
        builder: (context, state) {
          if (state.isLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
          }

          if (state.items.isEmpty) {
            return _buildEmptyState(context);
          }

          return Column(
            children: [
              // Dealer Verification Warning Banner (if not approved)
              if (!state.isDealerApproved)
                Container(
                  color: AppColors.error.withOpacity(0.12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: const Row(
                    children: [
                      Icon(Icons.lock_outline, color: AppColors.error, size: 20),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Your dealer account is awaiting admin approval. Order submission is temporarily disabled.',
                          style: TextStyle(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

              // Items List
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: state.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final item = state.items[index];
                    return _buildCartItemCard(context, item);
                  },
                ),
              ),

              // Summary and Submit Section
              _buildCheckoutSection(context, state),
            ],
          );
        },
      ),
    );
  }

  Widget _buildCartItemCard(BuildContext context, BulkOrderLineItem item) {
    final cubit = context.read<BulkOrderCartCubit>();
    final isMoqViolated = item.quantity < item.moq;
    final isStockExceeded = item.quantity > item.stockQuantity;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: (isMoqViolated || isStockExceeded) ? AppColors.error : AppColors.cardBorder,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 64,
                  height: 64,
                  color: AppColors.background,
                  child: Image.network(
                    item.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Icon(Icons.water_drop, color: AppColors.accentTeal),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            item.productName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.close, size: 18, color: AppColors.textSecondary),
                          onPressed: () => cubit.removeItem(item.productId),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Wholesale Unit: ₹\${item.wholesalePrice.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.accentTeal),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text('MOQ: \${item.moq} pcs', style: const TextStyle(fontSize: 10.5, color: AppColors.textSecondary)),
                        const SizedBox(width: 8),
                        Text('Stock: \${item.stockQuantity}', style: const TextStyle(fontSize: 10.5, color: AppColors.textSecondary)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 20),

          // Stepper + Line-item Total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Stepper
              Container(
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove, size: 16),
                      onPressed: item.quantity > item.moq
                          ? () => cubit.updateQuantity(item.productId, item.quantity - 1)
                          : () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Cannot reduce below Minimum Order Quantity (\${item.moq} units).'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                      color: item.quantity <= item.moq ? AppColors.textLight : AppColors.primaryNavy,
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        '\${item.quantity}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add, size: 16),
                      onPressed: item.quantity < item.stockQuantity
                          ? () => cubit.updateQuantity(item.productId, item.quantity + 1)
                          : null,
                      color: item.quantity >= item.stockQuantity ? AppColors.textLight : AppColors.primaryNavy,
                    ),
                  ],
                ),
              ),

              // Line total
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Line Total', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                  Text(
                    '₹\${item.lineTotal.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primaryNavy),
                  ),
                ],
              ),
            ],
          ),

          if (isMoqViolated)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Requires at least \${item.moq} units for wholesale pricing.',
                style: const TextStyle(color: AppColors.error, fontSize: 10.5, fontWeight: FontWeight.w600),
              ),
            ),
          if (isStockExceeded)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Only \${item.stockQuantity} units available in master warehouse.',
                style: const TextStyle(color: AppColors.error, fontSize: 10.5, fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCheckoutSection(BuildContext context, BulkOrderCartState state) {
    final canSubmit = state.isDealerApproved &&
        !state.isSubmitting &&
        state.items.isNotEmpty &&
        state.isMoqSatisfied &&
        state.isStockAvailable;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Pricing Breakdown
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Subtotal (\${state.totalUnits} items)', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                Text('₹\${state.subtotal.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Text('Commercial Freight', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    SizedBox(width: 4),
                    Tooltip(
                      message: 'Free commercial freight for bulk orders above ₹50,000',
                      child: Icon(Icons.info_outline, size: 14, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                Text(
                  state.deliveryCharges == 0 ? 'FREE' : '₹\${state.deliveryCharges.toStringAsFixed(0)}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: state.deliveryCharges == 0 ? AppColors.success : AppColors.primaryNavy,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('GST (18% Included in B2B)', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                Text('₹\${(state.subtotal * 0.18 / 1.18).toStringAsFixed(0)} ITC Eligible',
                    style: const TextStyle(fontSize: 12, color: AppColors.accentTeal, fontWeight: FontWeight.bold)),
              ],
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total Net Payable', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primaryNavy)),
                Text(
                  '₹\${state.totalAmount.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.primaryNavy),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Submit PO Button (Idempotent lock prevents duplicate clicks)
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: canSubmit
                    ? () => context.read<BulkOrderCartCubit>().submitBulkPurchaseOrder()
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryNavy,
                  disabledBackgroundColor: AppColors.textLight.withOpacity(0.3),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                child: state.isSubmitting
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          ),
                          SizedBox(width: 12),
                          Text('Generating Commercial PO...', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                        ],
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.assignment_turned_in_outlined, color: Colors.white, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Submit Bulk Order',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
                          ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.accentTeal.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.remove_shopping_cart_outlined, size: 40, color: AppColors.accentTeal),
            ),
            const SizedBox(height: 16),
            const Text(
              'Your Bulk Cart is Empty',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primaryNavy),
            ),
            const SizedBox(height: 8),
            const Text(
              'Explore the wholesale catalog to add master packs, RO purifiers, and commercial spare parts.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.push('/dealer/catalog'),
              icon: const Icon(Icons.storefront_rounded),
              label: const Text('Browse Wholesale Catalog'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryNavy,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmClearCart(BuildContext context) {
    showDialog(
      context: context,
      builder: (dlgContext) => AlertDialog(
        title: const Text('Clear Bulk Cart?'),
        content: const Text('Are you sure you want to remove all wholesale items from this procurement order?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dlgContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<BulkOrderCartCubit>().clearCart();
              Navigator.pop(dlgContext);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Clear All', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
`,
  },

  'dealer_order_history_screen.dart': {
    path: 'lib/features/dealer/views/dealer_order_history_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/dealer_order_history_cubit.dart';
import '../models/dealer_bulk_order_model.dart';
import 'dealer_order_detail_modal.dart';

class DealerOrderHistoryScreen extends StatefulWidget {
  const DealerOrderHistoryScreen({super.key});

  @override
  State<DealerOrderHistoryScreen> createState() => _DealerOrderHistoryScreenState();
}

class _DealerOrderHistoryScreenState extends State<DealerOrderHistoryScreen> {
  @override
  void initState() {
    super.initState();
    context.read<DealerOrderHistoryCubit>().loadDealerOrders();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Dealer Order History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            Text('Purchase Orders & Logistics Fulfillment', style: TextStyle(fontSize: 11, color: AppColors.accentTeal)),
          ],
        ),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Orders',
            onPressed: () => context.read<DealerOrderHistoryCubit>().loadDealerOrders(),
          ),
        ],
      ),
      body: BlocBuilder<DealerOrderHistoryCubit, DealerOrderHistoryState>(
        builder: (context, state) {
          if (state is DealerOrderHistoryLoading) {
            return const Center(child: CircularProgressIndicator(color: AppColors.accentTeal));
          }

          if (state is DealerOrderHistoryError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 48, color: AppColors.error),
                    const SizedBox(height: 12),
                    Text(
                      state.message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.read<DealerOrderHistoryCubit>().loadDealerOrders(),
                      child: const Text('Try Again'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (state is DealerOrderHistoryLoaded) {
            if (state.orders.isEmpty) {
              return _buildEmptyState(context);
            }

            return RefreshIndicator(
              color: AppColors.accentTeal,
              onRefresh: () => context.read<DealerOrderHistoryCubit>().loadDealerOrders(),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: state.orders.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final order = state.orders[index];
                  return _buildOrderCard(context, order);
                },
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, DealerBulkOrder order) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: PO Reference & Fulfilment Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.receipt_long_rounded, color: AppColors.primaryNavy, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      order.poNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy),
                    ),
                  ],
                ),
                _buildFulfilmentBadge(order.fulfilmentStatus),
              ],
            ),
            const SizedBox(height: 10),

            // Order Date & Item Summary
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 13, color: AppColors.textSecondary),
                    const SizedBox(width: 4),
                    Text(order.orderDateFormatted, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  ],
                ),
                Text(
                  '\${order.itemCount} items across \${order.lineItems.length} lines',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                ),
              ],
            ),
            const Divider(height: 22),

            // Amount & Payment Status + Action
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Net Invoice', style: TextStyle(fontSize: 10.5, color: AppColors.textSecondary)),
                    Text(
                      '₹\${order.totalAmount.toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.primaryNavy),
                    ),
                    const SizedBox(height: 2),
                    _buildPaymentStatusTag(order.paymentStatus),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => _openOrderDetailsModal(context, order),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.background,
                    foregroundColor: AppColors.primaryNavy,
                    elevation: 0,
                    side: const BorderSide(color: AppColors.cardBorder),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                  icon: const Icon(Icons.visibility_outlined, size: 16, color: AppColors.accentTeal),
                  label: const Text('View Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFulfilmentBadge(DealerFulfilmentStatus status) {
    Color bg;
    Color fg;
    String label;
    IconData icon;

    switch (status) {
      case DealerFulfilmentStatus.confirmed:
        bg = Colors.blue.withOpacity(0.12);
        fg = Colors.blue.shade800;
        label = 'CONFIRMED';
        icon = Icons.verified_outlined;
        break;
      case DealerFulfilmentStatus.processing:
        bg = Colors.orange.withOpacity(0.12);
        fg = Colors.orange.shade800;
        label = 'PROCESSING';
        icon = Icons.inventory_2_outlined;
        break;
      case DealerFulfilmentStatus.dispatched:
        bg = AppColors.accentTeal.withOpacity(0.15);
        fg = const Color(0xFF007A99);
        label = 'DISPATCHED';
        icon = Icons.local_shipping_outlined;
        break;
      case DealerFulfilmentStatus.delivered:
        bg = AppColors.success.withOpacity(0.12);
        fg = AppColors.success;
        label = 'DELIVERED';
        icon = Icons.check_circle_outline_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: fg),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: fg, fontSize: 10, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  Widget _buildPaymentStatusTag(DealerPaymentStatus status) {
    String text;
    Color color;

    switch (status) {
      case DealerPaymentStatus.paid:
        text = 'Payment: Settled (RTGS)';
        color = AppColors.success;
        break;
      case DealerPaymentStatus.creditNet30:
        text = 'Payment: Net 30 Credit Active';
        color = const Color(0xFF1E40AF);
        break;
      case DealerPaymentStatus.pending:
        text = 'Payment: Awaiting Transfer';
        color = Colors.amber.shade900;
        break;
    }

    return Text(
      text,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.assignment_outlined, size: 48, color: AppColors.textLight),
            const SizedBox(height: 12),
            const Text(
              'No Bulk Orders Found',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primaryNavy),
            ),
            const SizedBox(height: 6),
            const Text(
              'You have not submitted any wholesale purchase orders yet under this dealer account.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.push('/dealer/catalog'),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryNavy),
              child: const Text('Start Wholesale Procurement', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _openOrderDetailsModal(BuildContext context, DealerBulkOrder order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DealerOrderDetailModal(order: order),
    );
  }
}
`,
  },

  'dealer_order_detail_modal.dart': {
    path: 'lib/features/dealer/views/dealer_order_detail_modal.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../models/dealer_bulk_order_model.dart';

class DealerOrderDetailModal extends StatelessWidget {
  final DealerBulkOrder order;

  const DealerOrderDetailModal({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag Handle & Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
            child: Column(
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.textLight.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(order.poNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primaryNavy)),
                        Text('Ordered on \${order.orderDateFormatted}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Scrollable Body
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Delivery Address & Warehouse
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.warehouse_outlined, size: 16, color: AppColors.primaryNavy),
                          SizedBox(width: 8),
                          Text('Registered Delivery Warehouse', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primaryNavy)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(order.deliveryAddress, style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary, height: 1.4)),
                      const SizedBox(height: 4),
                      Text('GSTIN: \${order.dealerGstin}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.accentTeal)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Line Items List
                const Text('Purchased Wholesale Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primaryNavy)),
                const SizedBox(height: 8),
                ...order.lineItems.map((item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppColors.primaryNavy.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text('\${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primaryNavy)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.productName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.primaryNavy)),
                            Text('₹\${item.wholesalePrice.toStringAsFixed(0)} / unit', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          ],
                        ),
                      ),
                      Text('₹\${item.lineTotal.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryNavy)),
                    ],
                  ),
                )),
                const Divider(height: 24),

                // Price Breakdown
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Subtotal', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    Text('₹\${order.subtotal.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Freight & Logistics', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    Text(order.deliveryCharges == 0 ? 'FREE' : '₹\${order.deliveryCharges.toStringAsFixed(0)}',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: order.deliveryCharges == 0 ? AppColors.success : AppColors.primaryNavy)),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Included GST (18%)', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    Text('₹\${order.gstAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: AppColors.accentTeal, fontWeight: FontWeight.bold)),
                  ],
                ),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Grand Total', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primaryNavy)),
                    Text('₹\${order.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: AppColors.primaryNavy)),
                  ],
                ),
                const SizedBox(height: 24),

                // Support Action
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Connecting to Califnco B2B Logistics Desk for \${order.poNumber}...')),
                    );
                  },
                  icon: const Icon(Icons.headset_mic_outlined, size: 18),
                  label: const Text('Contact Key Account Manager'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primaryNavy,
                    side: const BorderSide(color: AppColors.cardBorder),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },

  'bulk_order_cart_cubit.dart': {
    path: 'lib/features/dealer/cubit/bulk_order_cart_cubit.dart',
    language: 'dart',
    content: `import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/dealer_bulk_order_model.dart';
import '../models/dealer_profile_model.dart';
import '../repositories/dealer_order_repository.dart';

class BulkOrderCartState {
  final List<BulkOrderLineItem> items;
  final bool isLoading;
  final bool isSubmitting;
  final bool isDealerApproved;
  final String? errorMessage;
  final DealerBulkOrder? submittedOrder;

  const BulkOrderCartState({
    this.items = const [],
    this.isLoading = false,
    this.isSubmitting = false,
    this.isDealerApproved = true,
    this.errorMessage,
    this.submittedOrder,
  });

  int get totalUnits => items.fold(0, (sum, i) => sum + i.quantity);

  double get subtotal => items.fold(0.0, (sum, i) => sum + i.lineTotal);

  // Free commercial freight for wholesale orders above ₹50,000; otherwise flat ₹1,200
  double get deliveryCharges {
    if (items.isEmpty) return 0.0;
    return subtotal >= 50000 ? 0.0 : 1200.0;
  }

  double get totalAmount => subtotal + deliveryCharges;

  bool get isMoqSatisfied => items.every((i) => i.quantity >= i.moq);

  bool get isStockAvailable => items.every((i) => i.quantity <= i.stockQuantity);

  BulkOrderCartState copyWith({
    List<BulkOrderLineItem>? items,
    bool? isLoading,
    bool? isSubmitting,
    bool? isDealerApproved,
    String? errorMessage,
    DealerBulkOrder? submittedOrder,
  }) {
    return BulkOrderCartState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      isDealerApproved: isDealerApproved ?? this.isDealerApproved,
      errorMessage: errorMessage,
      submittedOrder: submittedOrder,
    );
  }
}

class BulkOrderCartCubit extends Cubit<BulkOrderCartState> {
  final DealerOrderRepository _orderRepository;

  BulkOrderCartCubit({required DealerOrderRepository orderRepository})
      : _orderRepository = orderRepository,
        super(const BulkOrderCartState());

  void setDealerApprovalStatus(bool isApproved) {
    emit(state.copyWith(isDealerApproved: isApproved));
  }

  void addItem({
    required String productId,
    required String productName,
    required String category,
    required double wholesalePrice,
    required String imageUrl,
    required int moq,
    required int stockQuantity,
    int? quantity,
  }) {
    final qty = quantity ?? moq;
    final existingIndex = state.items.indexWhere((i) => i.productId == productId);

    List<BulkOrderLineItem> updated = List.from(state.items);
    if (existingIndex >= 0) {
      final existing = updated[existingIndex];
      final newQty = (existing.quantity + qty).clamp(moq, stockQuantity);
      updated[existingIndex] = existing.copyWith(quantity: newQty);
    } else {
      updated.add(BulkOrderLineItem(
        productId: productId,
        productName: productName,
        category: category,
        wholesalePrice: wholesalePrice,
        imageUrl: imageUrl,
        quantity: qty.clamp(moq, stockQuantity),
        moq: moq,
        stockQuantity: stockQuantity,
      ));
    }

    emit(state.copyWith(items: updated, submittedOrder: null));
  }

  void updateQuantity(String productId, int newQuantity) {
    List<BulkOrderLineItem> updated = state.items.map((item) {
      if (item.productId == productId) {
        // Enforce stock upper bound
        final clamped = newQuantity.clamp(1, item.stockQuantity);
        return item.copyWith(quantity: clamped);
      }
      return item;
    }).toList();

    emit(state.copyWith(items: updated));
  }

  void removeItem(String productId) {
    final updated = state.items.where((i) => i.productId != productId).toList();
    emit(state.copyWith(items: updated));
  }

  void clearCart() {
    emit(state.copyWith(items: []));
  }

  void clearError() {
    emit(state.copyWith(errorMessage: null));
  }

  /// Submits the bulk purchase order with duplicate submission prevention
  Future<void> submitBulkPurchaseOrder() async {
    // 1. Guard against duplicate submission while in flight
    if (state.isSubmitting) return;

    // 2. Validate dealer approval
    if (!state.isDealerApproved) {
      emit(state.copyWith(errorMessage: 'Cannot submit orders: Dealer status is not approved.'));
      return;
    }

    // 3. Validate cart content
    if (state.items.isEmpty) {
      emit(state.copyWith(errorMessage: 'Your wholesale cart is empty.'));
      return;
    }

    // 4. Validate MOQs
    if (!state.isMoqSatisfied) {
      emit(state.copyWith(errorMessage: 'Some line items do not meet the Minimum Order Quantity requirement.'));
      return;
    }

    // 5. Validate stock
    if (!state.isStockAvailable) {
      emit(state.copyWith(errorMessage: 'Some line items exceed master warehouse stock availability.'));
      return;
    }

    // Set lock to prevent duplicate clicks
    emit(state.copyWith(isSubmitting: true, errorMessage: null));

    try {
      final newOrder = await _orderRepository.submitBulkOrder(
        items: state.items,
        subtotal: state.subtotal,
        deliveryCharges: state.deliveryCharges,
        totalAmount: state.totalAmount,
      );

      // Successfully submitted: clear cart and trigger navigation
      emit(state.copyWith(
        items: [],
        isSubmitting: false,
        submittedOrder: newOrder,
      ));
    } catch (e) {
      emit(state.copyWith(
        isSubmitting: false,
        errorMessage: 'Failed to submit bulk order: \${e.toString()}',
      ));
    }
  }
}
`,
  },

  'dealer_order_history_cubit.dart': {
    path: 'lib/features/dealer/cubit/dealer_order_history_cubit.dart',
    language: 'dart',
    content: `import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/dealer_bulk_order_model.dart';
import '../repositories/dealer_order_repository.dart';

abstract class DealerOrderHistoryState {}

class DealerOrderHistoryInitial extends DealerOrderHistoryState {}

class DealerOrderHistoryLoading extends DealerOrderHistoryState {}

class DealerOrderHistoryLoaded extends DealerOrderHistoryState {
  final List<DealerBulkOrder> orders;
  DealerOrderHistoryLoaded(this.orders);
}

class DealerOrderHistoryError extends DealerOrderHistoryState {
  final String message;
  DealerOrderHistoryError(this.message);
}

class DealerOrderHistoryCubit extends Cubit<DealerOrderHistoryState> {
  final DealerOrderRepository _orderRepository;

  DealerOrderHistoryCubit({required DealerOrderRepository orderRepository})
      : _orderRepository = orderRepository,
        super(DealerOrderHistoryInitial());

  Future<void> loadDealerOrders() async {
    emit(DealerOrderHistoryLoading());
    try {
      final orders = await _orderRepository.getAuthorizedDealerOrders();
      emit(DealerOrderHistoryLoaded(orders));
    } catch (e) {
      emit(DealerOrderHistoryError('Unable to load wholesale orders: \${e.toString()}'));
    }
  }
}
`,
  },

  'dealer_bulk_order_model.dart': {
    path: 'lib/features/dealer/models/dealer_bulk_order_model.dart',
    language: 'dart',
    content: `enum DealerPaymentStatus { paid, creditNet30, pending }

enum DealerFulfilmentStatus { confirmed, processing, dispatched, delivered }

class BulkOrderLineItem {
  final String productId;
  final String productName;
  final String category;
  final double wholesalePrice;
  final String imageUrl;
  final int quantity;
  final int moq;
  final int stockQuantity;

  const BulkOrderLineItem({
    required this.productId,
    required this.productName,
    required this.category,
    required this.wholesalePrice,
    required this.imageUrl,
    required this.quantity,
    required this.moq,
    required this.stockQuantity,
  });

  double get lineTotal => wholesalePrice * quantity;

  BulkOrderLineItem copyWith({
    String? productId,
    String? productName,
    String? category,
    double? wholesalePrice,
    String? imageUrl,
    int? quantity,
    int? moq,
    int? stockQuantity,
  }) {
    return BulkOrderLineItem(
      productId: productId ?? this.productId,
      productName: productName ?? this.productName,
      category: category ?? this.category,
      wholesalePrice: wholesalePrice ?? this.wholesalePrice,
      imageUrl: imageUrl ?? this.imageUrl,
      quantity: quantity ?? this.quantity,
      moq: moq ?? this.moq,
      stockQuantity: stockQuantity ?? this.stockQuantity,
    );
  }

  Map<String, dynamic> toMap() => {
    'productId': productId,
    'productName': productName,
    'category': category,
    'wholesalePrice': wholesalePrice,
    'imageUrl': imageUrl,
    'quantity': quantity,
    'moq': moq,
    'lineTotal': lineTotal,
  };

  factory BulkOrderLineItem.fromMap(Map<String, dynamic> map) => BulkOrderLineItem(
    productId: map['productId'] ?? '',
    productName: map['productName'] ?? '',
    category: map['category'] ?? '',
    wholesalePrice: (map['wholesalePrice'] as num?)?.toDouble() ?? 0.0,
    imageUrl: map['imageUrl'] ?? '',
    quantity: (map['quantity'] as num?)?.toInt() ?? 1,
    moq: (map['moq'] as num?)?.toInt() ?? 1,
    stockQuantity: (map['stockQuantity'] as num?)?.toInt() ?? 999,
  );
}

class DealerBulkOrder {
  final String id;
  final String dealerId;
  final String poNumber;
  final DateTime orderDate;
  final String orderDateFormatted;
  final List<BulkOrderLineItem> lineItems;
  final int itemCount;
  final double subtotal;
  final double deliveryCharges;
  final double totalAmount;
  final DealerPaymentStatus paymentStatus;
  final DealerFulfilmentStatus fulfilmentStatus;
  final String deliveryAddress;
  final String dealerGstin;

  const DealerBulkOrder({
    required this.id,
    required this.dealerId,
    required this.poNumber,
    required this.orderDate,
    required this.orderDateFormatted,
    required this.lineItems,
    required this.itemCount,
    required this.subtotal,
    required this.deliveryCharges,
    required this.totalAmount,
    required this.paymentStatus,
    required this.fulfilmentStatus,
    required this.deliveryAddress,
    required this.dealerGstin,
  });

  double get gstAmount => (subtotal * 0.18) / 1.18;

  Map<String, dynamic> toMap() => {
    'id': id,
    'dealerId': dealerId,
    'poNumber': poNumber,
    'orderDate': orderDate.toIso8601String(),
    'orderDateFormatted': orderDateFormatted,
    'lineItems': lineItems.map((i) => i.toMap()).toList(),
    'itemCount': itemCount,
    'subtotal': subtotal,
    'deliveryCharges': deliveryCharges,
    'totalAmount': totalAmount,
    'paymentStatus': paymentStatus.name,
    'fulfilmentStatus': fulfilmentStatus.name,
    'deliveryAddress': deliveryAddress,
    'dealerGstin': dealerGstin,
  };

  factory DealerBulkOrder.fromMap(Map<String, dynamic> map) => DealerBulkOrder(
    id: map['id'] ?? '',
    dealerId: map['dealerId'] ?? '',
    poNumber: map['poNumber'] ?? '',
    orderDate: DateTime.tryParse(map['orderDate'] ?? '') ?? DateTime.now(),
    orderDateFormatted: map['orderDateFormatted'] ?? '',
    lineItems: ((map['lineItems'] as List?) ?? [])
        .map((i) => BulkOrderLineItem.fromMap(Map<String, dynamic>.from(i)))
        .toList(),
    itemCount: (map['itemCount'] as num?)?.toInt() ?? 0,
    subtotal: (map['subtotal'] as num?)?.toDouble() ?? 0.0,
    deliveryCharges: (map['deliveryCharges'] as num?)?.toDouble() ?? 0.0,
    totalAmount: (map['totalAmount'] as num?)?.toDouble() ?? 0.0,
    paymentStatus: DealerPaymentStatus.values.firstWhere(
      (s) => s.name == map['paymentStatus'],
      orElse: () => DealerPaymentStatus.creditNet30,
    ),
    fulfilmentStatus: DealerFulfilmentStatus.values.firstWhere(
      (s) => s.name == map['fulfilmentStatus'],
      orElse: () => DealerFulfilmentStatus.confirmed,
    ),
    deliveryAddress: map['deliveryAddress'] ?? '',
    dealerGstin: map['dealerGstin'] ?? '',
  );
}
`,
  },

  'dealer_order_repository.dart': {
    path: 'lib/features/dealer/repositories/dealer_order_repository.dart',
    language: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/dealer_bulk_order_model.dart';

abstract class DealerOrderRepository {
  Future<List<DealerBulkOrder>> getAuthorizedDealerOrders();
  Future<DealerBulkOrder> submitBulkOrder({
    required List<BulkOrderLineItem> items,
    required double subtotal,
    required double deliveryCharges,
    required double totalAmount,
  });
}

class FirebaseDealerOrderRepository implements DealerOrderRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  FirebaseDealerOrderRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  @override
  Future<List<DealerBulkOrder>> getAuthorizedDealerOrders() async {
    final currentDealer = _auth.currentUser;
    if (currentDealer == null) {
      throw Exception('Authentication required to access wholesale purchase orders.');
    }

    // STRICT MULTI-TENANT ISOLATION: Scoped query by current dealer's UID
    final snapshot = await _firestore
        .collection('dealer_orders')
        .where('dealerId', isEqualTo: currentDealer.uid)
        .orderBy('orderDate', descending: true)
        .get();

    return snapshot.docs.map((doc) => DealerBulkOrder.fromMap(doc.data())).toList();
  }

  @override
  Future<DealerBulkOrder> submitBulkOrder({
    required List<BulkOrderLineItem> items,
    required double subtotal,
    required double deliveryCharges,
    required double totalAmount,
  }) async {
    final currentDealer = _auth.currentUser;
    if (currentDealer == null) {
      throw Exception('Authentication required to submit commercial purchase orders.');
    }

    // 1. Fetch dealer profile to verify approval and attach billing gstin & warehouse
    final dealerDoc = await _firestore.collection('dealers').doc(currentDealer.uid).get();
    if (!dealerDoc.exists || dealerDoc.data()?['approvalStatus'] != 'approved') {
      throw Exception('Wholesale ordering forbidden: Dealer account is not approved.');
    }

    final dealerData = dealerDoc.data()!;
    final gstin = dealerData['gstin'] as String? ?? '27AABCV1234F1Z8';
    final warehouse = dealerData['registeredWarehouse'] as String? ?? 'Gala 14, Apex Industrial Estate, Thane West, Mumbai - 400604';

    final orderId = 'po_\${DateTime.now().millisecondsSinceEpoch}';
    final poNumber = 'PO-DLR-2026-\${(1000 + DateTime.now().millisecond).toString()}';
    final now = DateTime.now();

    final totalUnits = items.fold(0, (sum, i) => sum + i.quantity);

    final order = DealerBulkOrder(
      id: orderId,
      dealerId: currentDealer.uid,
      poNumber: poNumber,
      orderDate: now,
      orderDateFormatted: 'Today, \${now.hour.toString().padLeft(2, '0')}:\${now.minute.toString().padLeft(2, '0')}',
      lineItems: items,
      itemCount: totalUnits,
      subtotal: subtotal,
      deliveryCharges: deliveryCharges,
      totalAmount: totalAmount,
      paymentStatus: DealerPaymentStatus.creditNet30,
      fulfilmentStatus: DealerFulfilmentStatus.confirmed,
      deliveryAddress: warehouse,
      dealerGstin: gstin,
    );

    // Atomically persist to Firestore
    await _firestore.collection('dealer_orders').doc(orderId).set(order.toMap());

    return order;
  }
}
`,
  },
};
