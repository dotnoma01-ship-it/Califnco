export const FLUTTER_FILES_SEGMENT_10: Record<
  string,
  { path: string; language: string; content: string }
> = {
  'service_request_model.dart': {
    path: 'lib/features/service/models/service_request_model.dart',
    language: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:equatable/equatable.dart';

enum ServiceRequestCategory {
  installation('Installation', 'RO Installation'),
  maintenance('Maintenance', 'Preventive Maintenance'),
  repair('Repair', 'Purifier Repair');

  final String label;
  final String defaultFirestoreServiceType;
  const ServiceRequestCategory(this.label, this.defaultFirestoreServiceType);

  static ServiceRequestCategory fromString(String raw) {
    switch (raw.trim().toLowerCase()) {
      case 'installation':
        return ServiceRequestCategory.installation;
      case 'maintenance':
        return ServiceRequestCategory.maintenance;
      case 'repair':
      default:
        return ServiceRequestCategory.repair;
    }
  }
}

enum ServiceTicketStatus {
  open('open', 'Request Submitted (Unconfirmed)'),
  scheduled('scheduled', 'Appointment Confirmed'),
  inProgress('in_progress', 'Technician On-Site'),
  completed('completed', 'Service Completed'),
  cancelled('cancelled', 'Cancelled');

  final String firestoreValue;
  final String displayLabel;
  const ServiceTicketStatus(this.firestoreValue, this.displayLabel);

  bool get isAppointmentConfirmed =>
      this == ServiceTicketStatus.scheduled || this == ServiceTicketStatus.inProgress;

  static ServiceTicketStatus fromString(String raw) {
    switch (raw.trim()) {
      case 'scheduled':
        return ServiceTicketStatus.scheduled;
      case 'in_progress':
        return ServiceTicketStatus.inProgress;
      case 'completed':
        return ServiceTicketStatus.completed;
      case 'cancelled':
        return ServiceTicketStatus.cancelled;
      case 'open':
      default:
        return ServiceTicketStatus.open;
    }
  }
}

/// Represents live time-slot availability returned ONLY when a scheduling
/// document exists and is active in /service_schedules/{dateIso}_{postalCode}.
class ServiceScheduleAvailability extends Equatable {
  final bool isConfigured;
  final String scheduleId;
  final List<String> availableSlots;

  const ServiceScheduleAvailability({
    required this.isConfigured,
    required this.scheduleId,
    required this.availableSlots,
  });

  const ServiceScheduleAvailability.unconfigured([String scheduleId = ''])
      : isConfigured = false,
        scheduleId = scheduleId,
        availableSlots = const [];

  @override
  List<Object?> get props => [isConfigured, scheduleId, availableSlots];
}

class ServiceRequestModel extends Equatable {
  final String id;
  final String ticketNumber;
  final String orderId;
  final String orderNumber;
  final String customerUid;
  final String customerCode;
  final String customerDisplayName;
  final ServiceRequestCategory requestCategory;
  final String serviceType;
  final ServiceTicketStatus status;
  final String regionCity;
  final String submissionDateIso;
  final String preferredDateIso;
  final String preferredTimeSlot;
  final String productId;
  final String productModel;
  final String requestDetails;
  final String resolutionNotes;
  final String serviceAddress;
  final String contactPhone;
  final String contactName;

  const ServiceRequestModel({
    required this.id,
    required this.ticketNumber,
    required this.orderId,
    required this.orderNumber,
    required this.customerUid,
    required this.customerCode,
    required this.customerDisplayName,
    required this.requestCategory,
    required this.serviceType,
    required this.status,
    required this.regionCity,
    required this.submissionDateIso,
    required this.preferredDateIso,
    this.preferredTimeSlot = '',
    this.productId = '',
    required this.productModel,
    required this.requestDetails,
    this.resolutionNotes = '',
    required this.serviceAddress,
    required this.contactPhone,
    required this.contactName,
  });

  /// Strictly distinguishes a submitted request ('open') from a confirmed appointment ('scheduled').
  bool get isConfirmedAppointment => status.isAppointmentConfirmed;

  Map<String, dynamic> toFirestoreSummaryMap() {
    return {
      'ticketNumber': ticketNumber,
      'orderId': orderId,
      'orderNumber': orderNumber,
      'customerUid': customerUid,
      'customerCode': customerCode,
      'customerDisplayName': customerDisplayName,
      'requestCategory': requestCategory.label,
      'serviceType': serviceType,
      'status': 'open', // Enforced by Firestore rules on customer creation
      'regionCity': regionCity,
      'submissionDateIso': submissionDateIso,
      'scheduledDateIso': preferredDateIso,
      'preferredTimeSlot': preferredTimeSlot,
      'productId': productId,
      'productModel': productModel,
      'requestDetails': requestDetails,
      'resolutionNotes': '',
      'createdByUid': customerUid,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  Map<String, dynamic> toPrivateContactMap() {
    return {
      'requestId': id,
      'contactName': contactName,
      'phone': contactPhone,
      'serviceAddress': serviceAddress,
      'waterSourceTdsPpm': 0,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  factory ServiceRequestModel.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> doc, {
    Map<String, dynamic>? privateContactData,
  }) {
    final data = doc.data() ?? <String, dynamic>{};
    return ServiceRequestModel(
      id: doc.id,
      ticketNumber: (data['ticketNumber'] as String?) ?? doc.id.toUpperCase(),
      orderId: (data['orderId'] as String?) ?? 'DIRECT-SERVICE',
      orderNumber: (data['orderNumber'] as String?) ?? 'DIRECT-BOOKING',
      customerUid: (data['customerUid'] as String?) ?? '',
      customerCode: (data['customerCode'] as String?) ?? '',
      customerDisplayName: (data['customerDisplayName'] as String?) ?? 'Customer',
      requestCategory: ServiceRequestCategory.fromString(
        (data['requestCategory'] as String?) ?? 'Maintenance',
      ),
      serviceType: (data['serviceType'] as String?) ?? 'Preventive Maintenance',
      status: ServiceTicketStatus.fromString((data['status'] as String?) ?? 'open'),
      regionCity: (data['regionCity'] as String?) ?? '',
      submissionDateIso: (data['submissionDateIso'] as String?) ?? '',
      preferredDateIso: (data['scheduledDateIso'] as String?) ?? '',
      preferredTimeSlot: (data['preferredTimeSlot'] as String?) ?? '',
      productId: (data['productId'] as String?) ?? '',
      productModel: (data['productModel'] as String?) ?? 'Califnco Water System',
      requestDetails: (data['requestDetails'] as String?) ?? '',
      resolutionNotes: (data['resolutionNotes'] as String?) ?? '',
      serviceAddress: (privateContactData?['serviceAddress'] as String?) ??
          (data['regionCity'] as String?) ??
          '',
      contactPhone: (privateContactData?['phone'] as String?) ?? '',
      contactName: (privateContactData?['contactName'] as String?) ??
          (data['customerDisplayName'] as String?) ??
          '',
    );
  }

  @override
  List<Object?> get props => [
        id,
        ticketNumber,
        status,
        requestCategory,
        preferredDateIso,
        preferredTimeSlot,
        productId,
        productModel,
        requestDetails,
        serviceAddress,
        contactPhone,
      ];
}
`,
  },

  'service_repository.dart': {
    path: 'lib/features/service/repositories/service_repository.dart',
    language: 'dart',
    content: `import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/service_request_model.dart';

class ServiceRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  ServiceRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  /// Queries /service_schedules/{dateIso}_{postalCode} for configured time slots.
  /// Never fabricates or hardcodes slots when no active schedule config exists.
  Future<ServiceScheduleAvailability> fetchConfiguredTimeSlots({
    required String dateIso,
    required String postalCode,
  }) async {
    final cleanDate = dateIso.trim();
    final cleanPin = postalCode.trim().replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    if (cleanDate.length != 10 || cleanPin.length < 4) {
      return const ServiceScheduleAvailability.unconfigured();
    }

    final scheduleId = '\${cleanDate}_\${cleanPin}';
    final user = _auth.currentUser;
    if (user == null || !user.emailVerified) {
      return ServiceScheduleAvailability.unconfigured(scheduleId);
    }

    final snap = await _firestore.collection('service_schedules').doc(scheduleId).get();
    if (!snap.exists) {
      return ServiceScheduleAvailability.unconfigured(scheduleId);
    }

    final data = snap.data() ?? <String, dynamic>{};
    final isActive = data['isActive'] == true;
    final rawSlots = (data['availableSlots'] as List<dynamic>?) ?? const [];
    final slots = rawSlots
        .whereType<String>()
        .map((s) => s.trim())
        .where((s) => s.length >= 3 && s.length <= 40)
        .toList(growable: false);

    if (!isActive || slots.isEmpty) {
      return ServiceScheduleAvailability.unconfigured(scheduleId);
    }

    return ServiceScheduleAvailability(
      isConfigured: true,
      scheduleId: scheduleId,
      availableSlots: slots,
    );
  }

  /// Atomically writes /service_requests/{requestId} (status == 'open') AND
  /// /service_requests/{requestId}/private_details/contact in a single WriteBatch
  /// to satisfy the Zero-Trust PII Split-Collection & existsAfter() rules.
  Future<ServiceRequestModel> createServiceRequest({
    required ServiceRequestCategory category,
    required String productId,
    required String productModel,
    required String issueDescription,
    required String serviceAddress,
    required String cityRegion,
    required String preferredDateIso,
    required String preferredTimeSlot,
    required String contactPhone,
    required String contactName,
    String? linkedOrderId,
    String? linkedOrderNumber,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw StateError('Please sign in to submit a service booking request.');
    }
    if (!user.emailVerified) {
      throw StateError('Please verify your email address before submitting a service request.');
    }

    final rng = Random.secure();
    final suffix = 1000 + rng.nextInt(9000);
    final now = DateTime.now().toUtc();
    final requestId = 'srv-\${now.millisecondsSinceEpoch}-\$suffix';
    final ticketNumber = 'SRV-\${now.year}-\$suffix';

    final cleanUidPrefix = user.uid
        .replaceAll(RegExp(r'[^a-zA-Z0-9]'), '')
        .toUpperCase();
    final customerCode =
        'CUST-\${cleanUidPrefix.substring(0, cleanUidPrefix.length.clamp(0, 6)).padRight(4, 'X')}';

    final model = ServiceRequestModel(
      id: requestId,
      ticketNumber: ticketNumber,
      orderId: (linkedOrderId != null && linkedOrderId.isNotEmpty)
          ? linkedOrderId
          : 'DIRECT-SERVICE',
      orderNumber: (linkedOrderNumber != null && linkedOrderNumber.isNotEmpty)
          ? linkedOrderNumber
          : 'DIRECT-BOOKING',
      customerUid: user.uid,
      customerCode: customerCode,
      customerDisplayName: contactName.trim(),
      requestCategory: category,
      serviceType: category.defaultFirestoreServiceType,
      status: ServiceTicketStatus.open,
      regionCity: cityRegion.trim(),
      submissionDateIso: now.toIso8601String(),
      preferredDateIso: preferredDateIso.trim(),
      preferredTimeSlot: preferredTimeSlot.trim(),
      productId: productId.trim(),
      productModel: productModel.trim().isEmpty
          ? 'General Califnco Water Purification System'
          : productModel.trim(),
      requestDetails: issueDescription.trim(),
      resolutionNotes: '',
      serviceAddress: serviceAddress.trim(),
      contactPhone: contactPhone.trim(),
      contactName: contactName.trim(),
    );

    final requestRef = _firestore.collection('service_requests').doc(requestId);
    final privateContactRef =
        requestRef.collection('private_details').doc('contact');

    final batch = _firestore.batch();
    batch.set(requestRef, model.toFirestoreSummaryMap());
    batch.set(privateContactRef, model.toPrivateContactMap());
    await batch.commit();

    return model;
  }

  /// Watches a single service request along with its isolated contact subdocument.
  Stream<ServiceRequestModel> watchRequestById(
    String requestId, {
    ServiceRequestModel? fallback,
  }) {
    final requestRef = _firestore.collection('service_requests').doc(requestId);
    return requestRef.snapshots().asyncMap((docSnap) async {
      if (!docSnap.exists) {
        if (fallback != null) return fallback;
        throw StateError('Service request \$requestId was not found.');
      }
      Map<String, dynamic>? contactData;
      try {
        final contactSnap =
            await requestRef.collection('private_details').doc('contact').get();
        contactData = contactSnap.data();
      } catch (_) {
        // Fallback gracefully if offline
      }
      return ServiceRequestModel.fromFirestore(
        docSnap,
        privateContactData: contactData ??
            (fallback != null
                ? {
                    'serviceAddress': fallback.serviceAddress,
                    'phone': fallback.contactPhone,
                    'contactName': fallback.contactName,
                  }
                : null),
      );
    });
  }

  /// Streams the authenticated customer's own service requests (enforced by
  /// Firestore rule: resource.data.customerUid == request.auth.uid).
  Stream<List<ServiceRequestModel>> watchCustomerRequests(String customerUid) {
    return _firestore
        .collection('service_requests')
        .where('customerUid', isEqualTo: customerUid)
        .snapshots()
        .map((querySnap) {
      final list = querySnap.docs
          .map((doc) => ServiceRequestModel.fromFirestore(doc))
          .toList();
      list.sort((a, b) => b.submissionDateIso.compareTo(a.submissionDateIso));
      return list;
    });
  }
}
`,
  },

  'service_booking_cubit.dart': {
    path: 'lib/features/service/cubit/service_booking_cubit.dart',
    language: 'dart',
    content: `import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/service_request_model.dart';
import '../repositories/service_repository.dart';

class ServiceBookingState extends Equatable {
  final ServiceRequestCategory category;
  final String selectedProductId;
  final String selectedProductModel;
  final String issueDescription;
  final String streetAddress;
  final String cityState;
  final String postalCode;
  final String preferredDateIso;
  final String selectedTimeSlot;
  final String contactName;
  final String contactPhone;
  final ServiceScheduleAvailability scheduleAvailability;
  final bool isCheckingSchedule;
  final bool isSubmitting;
  final String? errorMessage;
  final ServiceRequestModel? submittedRequest;

  const ServiceBookingState({
    this.category = ServiceRequestCategory.installation,
    this.selectedProductId = 'wp-01',
    this.selectedProductModel = 'Califnco Hydra Pure Elite RO+UV+Copper',
    this.issueDescription = '',
    this.streetAddress = '',
    this.cityState = 'Mumbai, Maharashtra',
    this.postalCode = '400050',
    required this.preferredDateIso,
    this.selectedTimeSlot = '',
    this.contactName = '',
    this.contactPhone = '',
    this.scheduleAvailability = const ServiceScheduleAvailability.unconfigured(),
    this.isCheckingSchedule = false,
    this.isSubmitting = false,
    this.errorMessage,
    this.submittedRequest,
  });

  bool get isProductSelectionApplicable =>
      category == ServiceRequestCategory.installation ||
      category == ServiceRequestCategory.repair ||
      selectedProductId.isNotEmpty;

  ServiceBookingState copyWith({
    ServiceRequestCategory? category,
    String? selectedProductId,
    String? selectedProductModel,
    String? issueDescription,
    String? streetAddress,
    String? cityState,
    String? postalCode,
    String? preferredDateIso,
    String? selectedTimeSlot,
    String? contactName,
    String? contactPhone,
    ServiceScheduleAvailability? scheduleAvailability,
    bool? isCheckingSchedule,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    ServiceRequestModel? submittedRequest,
  }) {
    return ServiceBookingState(
      category: category ?? this.category,
      selectedProductId: selectedProductId ?? this.selectedProductId,
      selectedProductModel: selectedProductModel ?? this.selectedProductModel,
      issueDescription: issueDescription ?? this.issueDescription,
      streetAddress: streetAddress ?? this.streetAddress,
      cityState: cityState ?? this.cityState,
      postalCode: postalCode ?? this.postalCode,
      preferredDateIso: preferredDateIso ?? this.preferredDateIso,
      selectedTimeSlot: selectedTimeSlot ?? this.selectedTimeSlot,
      contactName: contactName ?? this.contactName,
      contactPhone: contactPhone ?? this.contactPhone,
      scheduleAvailability: scheduleAvailability ?? this.scheduleAvailability,
      isCheckingSchedule: isCheckingSchedule ?? this.isCheckingSchedule,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      submittedRequest: submittedRequest ?? this.submittedRequest,
    );
  }

  @override
  List<Object?> get props => [
        category,
        selectedProductId,
        selectedProductModel,
        issueDescription,
        streetAddress,
        cityState,
        postalCode,
        preferredDateIso,
        selectedTimeSlot,
        contactName,
        contactPhone,
        scheduleAvailability,
        isCheckingSchedule,
        isSubmitting,
        errorMessage,
        submittedRequest,
      ];
}

class ServiceBookingCubit extends Cubit<ServiceBookingState> {
  final ServiceRepository _repository;

  ServiceBookingCubit({
    required ServiceRepository repository,
    required String initialPreferredDateIso,
    String initialContactName = '',
    String initialPhone = '',
    String initialStreetAddress = '',
    String initialCityState = 'Mumbai, Maharashtra',
    String initialPostalCode = '400050',
  })  : _repository = repository,
        super(
          ServiceBookingState(
            preferredDateIso: initialPreferredDateIso,
            contactName: initialContactName,
            contactPhone: initialPhone,
            streetAddress: initialStreetAddress,
            cityState: initialCityState,
            postalCode: initialPostalCode,
          ),
        ) {
    refreshConfiguredSlots();
  }

  void selectCategory(ServiceRequestCategory category) {
    emit(state.copyWith(category: category, clearError: true));
  }

  void selectProduct({required String productId, required String productModel}) {
    emit(
      state.copyWith(
        selectedProductId: productId,
        selectedProductModel: productModel,
        clearError: true,
      ),
    );
  }

  void updateDescription(String value) {
    emit(state.copyWith(issueDescription: value, clearError: true));
  }

  void updateAddress({
    required String streetAddress,
    required String cityState,
    required String postalCode,
  }) {
    final pinChanged = postalCode.trim() != state.postalCode.trim();
    emit(
      state.copyWith(
        streetAddress: streetAddress,
        cityState: cityState,
        postalCode: postalCode,
        selectedTimeSlot: pinChanged ? '' : state.selectedTimeSlot,
        clearError: true,
      ),
    );
    if (pinChanged && postalCode.trim().length >= 4) {
      refreshConfiguredSlots();
    }
  }

  void updatePreferredDate(String dateIso) {
    emit(
      state.copyWith(
        preferredDateIso: dateIso,
        selectedTimeSlot: '',
        clearError: true,
      ),
    );
    refreshConfiguredSlots();
  }

  void selectTimeSlot(String slot) {
    if (!state.scheduleAvailability.isConfigured ||
        !state.scheduleAvailability.availableSlots.contains(slot)) {
      return;
    }
    emit(
      state.copyWith(
        selectedTimeSlot: state.selectedTimeSlot == slot ? '' : slot,
        clearError: true,
      ),
    );
  }

  void updateContact({String? name, String? phone}) {
    emit(
      state.copyWith(
        contactName: name ?? state.contactName,
        contactPhone: phone ?? state.contactPhone,
        clearError: true,
      ),
    );
  }

  Future<void> refreshConfiguredSlots() async {
    emit(state.copyWith(isCheckingSchedule: true));
    try {
      final availability = await _repository.fetchConfiguredTimeSlots(
        dateIso: state.preferredDateIso,
        postalCode: state.postalCode,
      );
      final validSlot = availability.isConfigured &&
              availability.availableSlots.contains(state.selectedTimeSlot)
          ? state.selectedTimeSlot
          : '';
      emit(
        state.copyWith(
          scheduleAvailability: availability,
          selectedTimeSlot: validSlot,
          isCheckingSchedule: false,
        ),
      );
    } catch (_) {
      emit(
        state.copyWith(
          scheduleAvailability: const ServiceScheduleAvailability.unconfigured(),
          selectedTimeSlot: '',
          isCheckingSchedule: false,
        ),
      );
    }
  }

  String? _validateForm() {
    if ((state.category == ServiceRequestCategory.installation ||
            state.category == ServiceRequestCategory.repair) &&
        state.selectedProductModel.trim().isEmpty) {
      return 'Please select the relevant Califnco product for \${state.category.label.toLowerCase()}.';
    }
    final desc = state.issueDescription.trim();
    if (desc.length < 10) {
      return 'Please describe the issue or installation requirement (at least 10 characters).';
    }
    if (desc.length > 600) {
      return 'Issue description must be 600 characters or fewer.';
    }
    if (state.streetAddress.trim().length < 5) {
      return 'Please provide a complete service street address.';
    }
    if (state.cityState.trim().length < 2) {
      return 'Please enter the service city and state.';
    }
    if (!RegExp(r'^[0-9A-Za-z\\- ]{4,16}$').hasMatch(state.postalCode.trim())) {
      return 'Please enter a valid PIN / postal code.';
    }
    if (!RegExp(r'^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        .hasMatch(state.preferredDateIso.trim())) {
      return 'Please select a valid preferred service date.';
    }
    final digitsOnly = state.contactPhone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return 'Please enter a valid 10-digit contact phone number.';
    }
    if (state.contactName.trim().length < 2) {
      return 'Please provide a contact person name.';
    }
    return null;
  }

  Future<void> submitBooking({
    String? linkedOrderId,
    String? linkedOrderNumber,
  }) async {
    if (state.isSubmitting) return;
    final validationError = _validateForm();
    if (validationError != null) {
      emit(state.copyWith(errorMessage: validationError));
      return;
    }

    emit(state.copyWith(isSubmitting: true, clearError: true));
    try {
      final fullAddress =
          '\${state.streetAddress.trim()}, \${state.cityState.trim()} - \${state.postalCode.trim()}';
      final confirmedConfigSlot = state.scheduleAvailability.isConfigured
          ? state.selectedTimeSlot
          : '';

      final created = await _repository.createServiceRequest(
        category: state.category,
        productId: state.selectedProductId,
        productModel: state.selectedProductModel,
        issueDescription: state.issueDescription,
        serviceAddress: fullAddress,
        cityRegion: state.cityState,
        preferredDateIso: state.preferredDateIso,
        preferredTimeSlot: confirmedConfigSlot,
        contactPhone: state.contactPhone,
        contactName: state.contactName,
        linkedOrderId: linkedOrderId,
        linkedOrderNumber: linkedOrderNumber,
      );

      emit(state.copyWith(isSubmitting: false, submittedRequest: created));
    } catch (e) {
      emit(
        state.copyWith(
          isSubmitting: false,
          errorMessage: e.toString().replaceFirst('Bad state: ', ''),
        ),
      );
    }
  }
}
`,
  },

  'service_booking_screen.dart': {
    path: 'lib/features/service/views/service_booking_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/service_booking_cubit.dart';
import '../models/service_request_model.dart';

/// SCREEN 23: SERVICE BOOKING
/// Supports Installation, Maintenance, and Repair requests with strict form
/// validation, Firestore persistence, and honest scheduling disclosures.
class ServiceBookingScreen extends StatefulWidget {
  final String? linkedOrderId;
  final String? linkedOrderNumber;

  const ServiceBookingScreen({
    super.key,
    this.linkedOrderId,
    this.linkedOrderNumber,
  });

  @override
  State<ServiceBookingScreen> createState() => _ServiceBookingScreenState();
}

class _ServiceBookingScreenState extends State<ServiceBookingScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _descriptionCtrl;
  late final TextEditingController _streetCtrl;
  late final TextEditingController _cityStateCtrl;
  late final TextEditingController _postalCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _nameCtrl;

  static const List<Map<String, String>> _applicableProducts = [
    {
      'id': 'wp-01',
      'name': 'Califnco Hydra Pure Elite RO+UV+Copper',
    },
    {
      'id': 'dp-01',
      'name': 'Califnco Aquara Touchless Digital Dispenser',
    },
    {
      'id': 'pm-01',
      'name': 'Califnco 150 GPD High-Torque Booster Pump',
    },
    {
      'id': 'fl-01',
      'name': 'Califnco 3-in-1 Filter Replacement Master Kit',
    },
    {
      'id': '',
      'name': 'Not Applicable / General Water System Assessment',
    },
  ];

  @override
  void initState() {
    super.initState();
    final initial = context.read<ServiceBookingCubit>().state;
    _descriptionCtrl = TextEditingController(text: initial.issueDescription);
    _streetCtrl = TextEditingController(text: initial.streetAddress);
    _cityStateCtrl = TextEditingController(text: initial.cityState);
    _postalCtrl = TextEditingController(text: initial.postalCode);
    _phoneCtrl = TextEditingController(text: initial.contactPhone);
    _nameCtrl = TextEditingController(text: initial.contactName);
  }

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    _streetCtrl.dispose();
    _cityStateCtrl.dispose();
    _postalCtrl.dispose();
    _phoneCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickPreferredDate(
    BuildContext context,
    String currentIso,
  ) async {
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final initialDate = DateTime.tryParse(currentIso) ?? tomorrow;

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate.isBefore(tomorrow) ? tomorrow : initialDate,
      firstDate: tomorrow,
      lastDate: now.add(const Duration(days: 60)),
    );

    if (picked != null && context.mounted) {
      final iso =
          '\${picked.year.toString().padLeft(4, '0')}-\${picked.month.toString().padLeft(2, '0')}-\${picked.day.toString().padLeft(2, '0')}';
      context.read<ServiceBookingCubit>().updatePreferredDate(iso);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/home'),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Book Purifier Service',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            ),
            Text(
              'Installation, Maintenance & Repair',
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
            ),
          ],
        ),
      ),
      body: BlocConsumer<ServiceBookingCubit, ServiceBookingState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: AppColors.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
          if (state.submittedRequest != null) {
            context.pushReplacement(
              '/service/confirmation',
              extra: state.submittedRequest,
            );
          }
        },
        builder: (context, state) {
          final cubit = context.read<ServiceBookingCubit>();

          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 110),
              children: [
                // 1. Service Type Selection
                _SectionCard(
                  title: '1. Select Service Type',
                  child: Row(
                    children: ServiceRequestCategory.values.map((cat) {
                      final selected = state.category == cat;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () => cubit.selectCategory(cat),
                            child: Container(
                              constraints: const BoxConstraints(minHeight: 52),
                              padding: const EdgeInsets.symmetric(
                                vertical: 12,
                                horizontal: 8,
                              ),
                              decoration: BoxDecoration(
                                color: selected
                                    ? AppColors.primaryNavy
                                    : AppColors.background,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: selected
                                      ? AppColors.primaryNavy
                                      : AppColors.borderLight,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                cat.label,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: selected
                                      ? Colors.white
                                      : AppColors.primaryNavy,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),

                // 2. Relevant Product Selection (where applicable)
                _SectionCard(
                  title: state.category == ServiceRequestCategory.maintenance
                      ? '2. Purifier Model (Optional for General Checkup)'
                      : '2. Select Relevant Califnco Product',
                  child: DropdownButtonFormField<String>(
                    value: state.selectedProductModel,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                    items: _applicableProducts
                        .where((p) =>
                            state.category ==
                                ServiceRequestCategory.maintenance ||
                            p['id']!.isNotEmpty)
                        .map(
                          (prod) => DropdownMenuItem<String>(
                            value: prod['name']!,
                            child: Text(
                              prod['name']!,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: (selectedName) {
                      if (selectedName == null) return;
                      final match = _applicableProducts.firstWhere(
                        (p) => p['name'] == selectedName,
                        orElse: () => _applicableProducts.first,
                      );
                      cubit.selectProduct(
                        productId: match['id']!,
                        productModel: match['name']!,
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),

                // 3. Description of the Issue / Requirement
                _SectionCard(
                  title: '3. Description of the Issue or Request',
                  child: TextFormField(
                    controller: _descriptionCtrl,
                    maxLines: 3,
                    maxLength: 600,
                    onChanged: cubit.updateDescription,
                    decoration: InputDecoration(
                      hintText: state.category ==
                              ServiceRequestCategory.installation
                          ? 'Describe water inlet location, wall-mount or counter preference, and plumbing readiness...'
                          : 'Describe flow rate drop, taste/TDS change, error indicator, or leakage symptoms...',
                      border: const OutlineInputBorder(),
                    ),
                    validator: (value) {
                      final trimmed = (value ?? '').trim();
                      if (trimmed.length < 10) {
                        return 'Enter at least 10 characters describing your request.';
                      }
                      return null;
                    },
                  ),
                ),
                const SizedBox(height: 12),

                // 4. Service Address
                _SectionCard(
                  title: '4. Service Address',
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _streetCtrl,
                        maxLines: 2,
                        onChanged: (val) => cubit.updateAddress(
                          streetAddress: val,
                          cityState: _cityStateCtrl.text,
                          postalCode: _postalCtrl.text,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Flat / House No., Building, Street',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().length < 5)
                            ? 'Enter complete street address'
                            : null,
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: TextFormField(
                              controller: _cityStateCtrl,
                              onChanged: (val) => cubit.updateAddress(
                                streetAddress: _streetCtrl.text,
                                cityState: val,
                                postalCode: _postalCtrl.text,
                              ),
                              decoration: const InputDecoration(
                                labelText: 'City & State',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) =>
                                  (v == null || v.trim().length < 2)
                                      ? 'Required'
                                      : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _postalCtrl,
                              keyboardType: TextInputType.number,
                              onChanged: (val) => cubit.updateAddress(
                                streetAddress: _streetCtrl.text,
                                cityState: _cityStateCtrl.text,
                                postalCode: val,
                              ),
                              decoration: const InputDecoration(
                                labelText: 'PIN Code',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) => (v == null ||
                                      !RegExp(r'^[0-9A-Za-z\\- ]{4,16}$')
                                          .hasMatch(v.trim()))
                                  ? 'Invalid PIN'
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 5. Preferred Date & Configured Time Slots ONLY when supplied
                _SectionCard(
                  title: '5. Preferred Service Date',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                          alignment: Alignment.centerLeft,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () =>
                            _pickPreferredDate(context, state.preferredDateIso),
                        icon: const Icon(Icons.calendar_today_outlined, size: 18),
                        label: Text(
                          'Preferred Date: \${state.preferredDateIso}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                      const SizedBox(height: 12),

                      if (state.isCheckingSchedule)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: LinearProgressIndicator(minHeight: 2),
                        )
                      else if (state.scheduleAvailability.isConfigured &&
                          state.scheduleAvailability.availableSlots.isNotEmpty) ...[
                        const Text(
                          'Preferred Time Window (From Configured Dispatch Roster)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryNavy,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: state.scheduleAvailability.availableSlots
                              .map((slot) {
                            final isSelected = state.selectedTimeSlot == slot;
                            return ChoiceChip(
                              label: Text(slot),
                              selected: isSelected,
                              selectedColor:
                                  AppColors.accentTeal.withValues(alpha: 0.18),
                              onSelected: (_) => cubit.selectTimeSlot(slot),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Note: Selecting a preferred window requests that slot; final appointment confirmation is issued after technician assignment.',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
                        ),
                      ] else
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: const Text(
                            'Real-time time slots are not configured for this PIN/date. Submit your preferred date and a Califnco coordinator will call to confirm an exact appointment time.',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: AppColors.textSecondary,
                              height: 1.4,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 6. Contact Person & Phone Number
                _SectionCard(
                  title: '6. On-Site Contact Details',
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _nameCtrl,
                        onChanged: (val) => cubit.updateContact(name: val),
                        decoration: const InputDecoration(
                          labelText: 'Contact Person Name',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().length < 2)
                            ? 'Enter contact name'
                            : null,
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                        onChanged: (val) => cubit.updateContact(phone: val),
                        decoration: const InputDecoration(
                          labelText: 'Contact Phone Number',
                          hintText: '+91 98765 43210',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) {
                          final digits =
                              (v ?? '').replaceAll(RegExp(r'[^0-9]'), '');
                          if (digits.length < 10 || digits.length > 15) {
                            return 'Enter a valid 10-digit phone number';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Unconfirmed Appointment Honesty Disclosure
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceWhite,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.info_outline_rounded,
                        size: 18,
                        color: AppColors.primaryNavy,
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Submitting this form logs an open service request. Your appointment date and time are confirmed only after Califnco Service Desk verifies technician availability.',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
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
      bottomNavigationBar: BlocBuilder<ServiceBookingCubit, ServiceBookingState>(
        builder: (context, state) {
          return SafeArea(
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: const BoxDecoration(
                color: AppColors.surfaceWhite,
                border: Border(top: BorderSide(color: AppColors.borderLight)),
              ),
              child: ElevatedButton(
                onPressed: state.isSubmitting
                    ? null
                    : () {
                        if (_formKey.currentState?.validate() ?? false) {
                          context.read<ServiceBookingCubit>().submitBooking(
                                linkedOrderId: widget.linkedOrderId,
                                linkedOrderNumber: widget.linkedOrderNumber,
                              );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryNavy,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: state.isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Submit Request',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: AppColors.primaryNavy,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
`,
  },

  'booking_confirmation_screen.dart': {
    path: 'lib/features/service/views/booking_confirmation_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../models/service_request_model.dart';
import '../repositories/service_repository.dart';

/// SCREEN 24: BOOKING CONFIRMATION
/// Clearly distinguishes a submitted service request ('open') from a
/// confirmed technician appointment ('scheduled'), streams live updates from
/// ServiceRepository, and provides "View My Requests" + "Return Home" actions.
class BookingConfirmationScreen extends StatelessWidget {
  final ServiceRequestModel initialRequest;

  const BookingConfirmationScreen({
    super.key,
    required this.initialRequest,
  });

  @override
  Widget build(BuildContext context) {
    final repository = context.read<ServiceRepository>();

    return StreamBuilder<ServiceRequestModel>(
      stream: repository.watchRequestById(
        initialRequest.id,
        fallback: initialRequest,
      ),
      initialData: initialRequest,
      builder: (context, snapshot) {
        final request = snapshot.data ?? initialRequest;
        final isConfirmed = request.isConfirmedAppointment;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surfaceWhite,
            foregroundColor: AppColors.primaryNavy,
            elevation: 0,
            automaticallyImplyLeading: false,
            title: Text(
              isConfirmed ? 'Appointment Confirmed' : 'Service Request Received',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Primary Status Distinction Header Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surfaceWhite,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isConfirmed
                        ? AppColors.accentTeal
                        : AppColors.borderLight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isConfirmed
                                ? AppColors.accentTeal.withValues(alpha: 0.12)
                                : Colors.amber.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            isConfirmed
                                ? Icons.verified_rounded
                                : Icons.schedule_send_rounded,
                            color: isConfirmed
                                ? AppColors.accentTeal
                                : Colors.amber.shade800,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                isConfirmed
                                    ? 'Confirmed Technician Appointment'
                                    : 'Request Submitted — Pending Confirmation',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15,
                                  color: AppColors.primaryNavy,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Reference: \${request.ticketNumber}',
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.accentTeal,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isConfirmed
                          ? 'Califnco Service Desk has verified technician availability and confirmed your visit.'
                          : 'This is an acknowledgement of your submitted request, not a confirmed appointment time. Our dispatch desk is reviewing technician availability for your area.',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Booking Summary Details Card
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
                      'Request Summary',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.primaryNavy,
                      ),
                    ),
                    const Divider(height: 22),
                    _DetailRow(
                      label: 'Service Reference',
                      value: request.ticketNumber,
                      isMonospace: true,
                    ),
                    _DetailRow(
                      label: 'Current Status',
                      value: request.status.displayLabel,
                    ),
                    _DetailRow(
                      label: 'Requested Service',
                      value: request.requestCategory.label,
                    ),
                    if (request.productModel.isNotEmpty)
                      _DetailRow(
                        label: 'Product / System',
                        value: request.productModel,
                      ),
                    _DetailRow(
                      label: isConfirmed ? 'Confirmed Date' : 'Preferred Date',
                      value: request.preferredDateIso.isEmpty
                          ? 'Flexible'
                          : request.preferredDateIso,
                    ),
                    if (request.preferredTimeSlot.isNotEmpty)
                      _DetailRow(
                        label: isConfirmed
                            ? 'Confirmed Window'
                            : 'Preferred Time (Unconfirmed)',
                        value: request.preferredTimeSlot,
                      ),
                    _DetailRow(
                      label: 'Service Address',
                      value: request.serviceAddress,
                    ),
                    if (request.contactPhone.isNotEmpty)
                      _DetailRow(
                        label: 'Contact Phone',
                        value: request.contactPhone,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Next Steps Card
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
                      'Next Steps',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.primaryNavy,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (isConfirmed) ...[
                      const _StepItem(
                        number: '01',
                        text:
                            'Your assigned Califnco water specialist will call 30 minutes prior to arrival.',
                      ),
                      const _StepItem(
                        number: '02',
                        text:
                            'Ensure water supply and power access near the purification unit are accessible.',
                      ),
                      const _StepItem(
                        number: '03',
                        text:
                            'Post-service TDS calibration and hygiene verification will be recorded on completion.',
                      ),
                    ] else ...[
                      const _StepItem(
                        number: '01',
                        text:
                            'Califnco Service Desk reviews regional technician capacity for your PIN code.',
                      ),
                      const _StepItem(
                        number: '02',
                        text:
                            'A dispatch coordinator calls your contact number to confirm a guaranteed appointment slot.',
                      ),
                      const _StepItem(
                        number: '03',
                        text:
                            'Once confirmed, your request status updates from Request Submitted to Appointment Confirmed.',
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 22),

              // Action Buttons: View My Requests & Return Home
              OutlinedButton.icon(
                onPressed: () => _showMyRequestsSheet(context, repository, request.customerUid),
                icon: const Icon(Icons.list_alt_rounded, size: 18),
                label: const Text(
                  'View My Requests',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryNavy,
                  side: const BorderSide(color: AppColors.primaryNavy),
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              ElevatedButton.icon(
                onPressed: () => context.go('/home'),
                icon: const Icon(Icons.home_outlined, size: 18),
                label: const Text(
                  'Return Home',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryNavy,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showMyRequestsSheet(
    BuildContext context,
    ServiceRepository repository,
    String customerUid,
  ) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surfaceWhite,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.65,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          builder: (_, scrollController) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 5,
                      decoration: BoxDecoration(
                        color: AppColors.borderLight,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'My Service Requests',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryNavy,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: StreamBuilder<List<ServiceRequestModel>>(
                      stream: repository.watchCustomerRequests(customerUid),
                      builder: (context, snap) {
                        if (snap.connectionState == ConnectionState.waiting) {
                          return const Center(
                            child: CircularProgressIndicator(
                              color: AppColors.accentTeal,
                            ),
                          );
                        }
                        final items = snap.data ?? const [];
                        if (items.isEmpty) {
                          return const Center(
                            child: Text(
                              'No submitted service requests found.',
                              style: TextStyle(color: AppColors.textSecondary),
                            ),
                          );
                        }
                        return ListView.separated(
                          controller: scrollController,
                          itemCount: items.length,
                          separatorBuilder: (_, __) => const Divider(height: 18),
                          itemBuilder: (_, idx) {
                            final item = items[idx];
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                '\${item.ticketNumber} · \${item.requestCategory.label}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: AppColors.primaryNavy,
                                ),
                              ),
                              subtitle: Text(
                                '\${item.productModel}\\nPreferred: \${item.preferredDateIso} · \${item.status.displayLabel}',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: AppColors.textSecondary,
                                  height: 1.35,
                                ),
                              ),
                              isThreeLine: true,
                              onTap: () {
                                Navigator.pop(sheetCtx);
                                context.pushReplacement(
                                  '/service/confirmation',
                                  extra: item,
                                );
                              },
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isMonospace;

  const _DetailRow({
    required this.label,
    required this.value,
    this.isMonospace = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                fontFamily: isMonospace ? 'monospace' : null,
                color: AppColors.primaryNavy,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepItem extends StatelessWidget {
  final String number;
  final String text;

  const _StepItem({required this.number, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            number,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontWeight: FontWeight.w800,
              fontSize: 12,
              color: AppColors.accentTeal,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`,
  },

  'service_router_routes.dart': {
    path: 'lib/core/router/service_router_routes.dart',
    language: 'dart',
    content: `import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/service/cubit/service_booking_cubit.dart';
import '../../features/service/models/service_request_model.dart';
import '../../features/service/repositories/service_repository.dart';
import '../../features/service/views/booking_confirmation_screen.dart';
import '../../features/service/views/service_booking_screen.dart';

/// GoRouter registrations for Screen 23 (Service Booking) & Screen 24 (Booking Confirmation)
List<GoRoute> buildServiceRoutes(ServiceRepository serviceRepository) {
  return [
    GoRoute(
      path: '/service/book',
      name: 'service_booking',
      builder: (context, state) {
        final tomorrow = DateTime.now().add(const Duration(days: 1));
        final defaultIso =
            '\${tomorrow.year.toString().padLeft(4, '0')}-\${tomorrow.month.toString().padLeft(2, '0')}-\${tomorrow.day.toString().padLeft(2, '0')}';
        final qp = state.uri.queryParameters;

        return RepositoryProvider.value(
          value: serviceRepository,
          child: BlocProvider(
            create: (_) => ServiceBookingCubit(
              repository: serviceRepository,
              initialPreferredDateIso: defaultIso,
            ),
            child: ServiceBookingScreen(
              linkedOrderId: qp['orderId'],
              linkedOrderNumber: qp['orderNumber'],
            ),
          ),
        );
      },
    ),
    GoRoute(
      path: '/service/confirmation',
      name: 'booking_confirmation',
      redirect: (context, state) {
        if (state.extra is! ServiceRequestModel) {
          return '/service/book';
        }
        return null;
      },
      builder: (context, state) {
        final request = state.extra! as ServiceRequestModel;
        return RepositoryProvider.value(
          value: serviceRepository,
          child: BookingConfirmationScreen(initialRequest: request),
        );
      },
    ),
  ];
}
`,
  },
};
