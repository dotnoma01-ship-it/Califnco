export const FLUTTER_FILES_SEGMENT_11: Record<
  string,
  { path: string; language: string; content: string }
> = {
  'notification_model.dart': {
    path: 'lib/features/notifications/models/notification_model.dart',
    language: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:equatable/equatable.dart';

enum NotificationEventType {
  orderConfirmed('order_confirmed', 'Order Confirmed'),
  orderProcessing('order_processing', 'Order Processing'),
  orderDispatched('order_dispatched', 'Order Dispatched'),
  orderDelivered('order_delivered', 'Order Delivered'),
  orderCancelled('order_cancelled', 'Order Cancelled'),
  paymentSettled('payment_settled', 'Payment Verified'),
  serviceScheduled('service_scheduled', 'Service Scheduled'),
  systemNotice('system_notice', 'Account Notice');

  final String firestoreValue;
  final String label;
  const NotificationEventType(this.firestoreValue, this.label);

  static NotificationEventType fromString(String raw) {
    for (final value in NotificationEventType.values) {
      if (value.firestoreValue == raw.trim()) {
        return value;
      }
    }
    return NotificationEventType.systemNotice;
  }
}

class AppNotificationModel extends Equatable {
  final String id;
  final String recipientUid;
  final String title;
  final String body;
  final NotificationEventType eventType;
  final String? orderId;
  final String? orderNumber;
  final String source;
  final bool isRead;
  final DateTime createdAt;
  final DateTime? readAt;

  const AppNotificationModel({
    required this.id,
    required this.recipientUid,
    required this.title,
    required this.body,
    required this.eventType,
    this.orderId,
    this.orderNumber,
    required this.source,
    required this.isRead,
    required this.createdAt,
    this.readAt,
  });

  factory AppNotificationModel.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? const <String, dynamic>{};
    final createdTs = data['createdAt'];
    final readTs = data['readAt'];

    DateTime parsedCreated;
    if (createdTs is Timestamp) {
      parsedCreated = createdTs.toDate();
    } else if (data['createdAtIso'] is String) {
      parsedCreated =
          DateTime.tryParse(data['createdAtIso'] as String) ?? DateTime.now();
    } else {
      parsedCreated = DateTime.now();
    }

    return AppNotificationModel(
      id: doc.id,
      recipientUid: (data['recipientUid'] as String?) ?? '',
      title: (data['title'] as String?) ?? 'Califnco Notification',
      body: (data['body'] as String?) ?? '',
      eventType: NotificationEventType.fromString(
        (data['eventType'] as String?) ?? 'system_notice',
      ),
      orderId: (data['orderId'] as String?)?.isNotEmpty == true
          ? data['orderId'] as String
          : null,
      orderNumber: (data['orderNumber'] as String?)?.isNotEmpty == true
          ? data['orderNumber'] as String
          : null,
      source: (data['source'] as String?) ?? 'trusted_backend_order_event',
      isRead: data['isRead'] == true,
      createdAt: parsedCreated,
      readAt: readTs is Timestamp ? readTs.toDate() : null,
    );
  }

  AppNotificationModel copyWith({
    bool? isRead,
    DateTime? readAt,
  }) {
    return AppNotificationModel(
      id: id,
      recipientUid: recipientUid,
      title: title,
      body: body,
      eventType: eventType,
      orderId: orderId,
      orderNumber: orderNumber,
      source: source,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      readAt: readAt ?? this.readAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        recipientUid,
        title,
        body,
        eventType,
        orderId,
        orderNumber,
        source,
        isRead,
        createdAt,
        readAt,
      ];
}
`,
  },

  'fcm_notification_service.dart': {
    path: 'lib/features/notifications/services/fcm_notification_service.dart',
    language: 'dart',
    content: `import 'dart:async';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Top-level background isolate entrypoint for Firebase Cloud Messaging.
/// Invoked by Android/iOS OS push daemon when app is backgrounded or terminated.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Do NOT fabricate local notifications here if the FCM payload already includes
  // a \`notification\` block (OS system tray renders it automatically).
  debugPrint(
    '[FCM Background] Received trusted message id=\${message.messageId} '
    'type=\${message.data['eventType'] ?? 'unknown'}',
  );
}

enum PushTransportState {
  unsupportedPlatform,
  permissionNotRequested,
  permissionDenied,
  authorizedTokenRegistered,
  tokenRegistrationFailed,
}

class FcmRegistrationSnapshot {
  final PushTransportState state;
  final AuthorizationStatus? authorizationStatus;
  final String? deviceId;
  final String statusDetail;

  const FcmRegistrationSnapshot({
    required this.state,
    this.authorizationStatus,
    this.deviceId,
    required this.statusDetail,
  });

  bool get isPushActive =>
      state == PushTransportState.authorizedTokenRegistered;
}

/// Manages FCM permissions, secure per-user device token registration,
/// token rotation, sign-out token revocation, and distinct foreground vs
/// background notification routing without fabricating delivery success.
class FcmNotificationService {
  static const String _installSeedPrefsKey = 'califnco_device_install_seed_v1';
  static const AndroidNotificationChannel _orderChannel =
      AndroidNotificationChannel(
    'califnco_order_updates',
    'Order & Service Updates',
    description: 'Trusted Califnco order dispatch, delivery, and service alerts.',
    importance: Importance.high,
  );

  final FirebaseMessaging _messaging;
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;
  final FlutterLocalNotificationsPlugin _localNotifications;

  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _foregroundMessageSub;
  StreamSubscription<RemoteMessage>? _openedAppSub;

  final StreamController<RemoteMessage> _foregroundAlertController =
      StreamController<RemoteMessage>.broadcast();
  final StreamController<String> _deepLinkRouteController =
      StreamController<String>.broadcast();

  FcmNotificationService({
    FirebaseMessaging? messaging,
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
    FlutterLocalNotificationsPlugin? localNotifications,
  })  : _messaging = messaging ?? FirebaseMessaging.instance,
        _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance,
        _localNotifications =
            localNotifications ?? FlutterLocalNotificationsPlugin();

  Stream<RemoteMessage> get foregroundAlerts =>
      _foregroundAlertController.stream;
  Stream<String> get notificationDeepLinks => _deepLinkRouteController.stream;

  Future<void> initializeListeners() async {
    final supported = await _messaging.isSupported();
    if (!supported) {
      return;
    }

    // Configure local notifications for FOREGROUND display on Android/iOS
    if (!kIsWeb) {
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosInit = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );
      await _localNotifications.initialize(
        const InitializationSettings(android: androidInit, iOS: iosInit),
        onDidReceiveNotificationResponse: (response) {
          final route = response.payload;
          if (route != null && route.isNotEmpty) {
            _deepLinkRouteController.add(route);
          }
        },
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_orderChannel);

      // iOS foreground banner presentation
      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
    }

    // 1. FOREGROUND behaviour: app is open in memory -> display unobtrusive heads-up
    // banner and emit to in-app foreground stream.
    _foregroundMessageSub ??=
        FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      _foregroundAlertController.add(message);
      final notification = message.notification;
      if (!kIsWeb && notification != null) {
        final route = _resolveRouteFromData(message.data);
        await _localNotifications.show(
          notification.hashCode,
          notification.title ?? 'Califnco Order Update',
          notification.body ?? '',
          NotificationDetails(
            android: AndroidNotificationDetails(
              _orderChannel.id,
              _orderChannel.name,
              channelDescription: _orderChannel.description,
              importance: Importance.high,
              priority: Priority.high,
            ),
            iOS: const DarwinNotificationDetails(presentAlert: true),
          ),
          payload: route,
        );
      }
    });

    // 2. BACKGROUND -> OPENED behaviour: user taps OS system tray notification
    _openedAppSub ??= FirebaseMessaging.onMessageOpenedApp.listen((message) {
      _deepLinkRouteController.add(_resolveRouteFromData(message.data));
    });

    // 3. TERMINATED -> COLD LAUNCH behaviour
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _deepLinkRouteController.add(_resolveRouteFromData(initialMessage.data));
    }

    // 4. Secure token rotation listener
    _tokenRefreshSub ??= _messaging.onTokenRefresh.listen((freshToken) async {
      final user = _auth.currentUser;
      if (user != null && user.emailVerified) {
        final settings = await _messaging.getNotificationSettings();
        await _persistDeviceToken(
          user: user,
          token: freshToken,
          settings: settings,
        );
      }
    });
  }

  /// Checks current OS permission state without prompting the user prematurely.
  Future<FcmRegistrationSnapshot> inspectPermissionStatus() async {
    final supported = await _messaging.isSupported();
    if (!supported) {
      return const FcmRegistrationSnapshot(
        state: PushTransportState.unsupportedPlatform,
        statusDetail:
            'Firebase Cloud Messaging is not supported in this runtime; '
            'in-app Firestore notifications remain active.',
      );
    }

    final settings = await _messaging.getNotificationSettings();
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      return FcmRegistrationSnapshot(
        state: PushTransportState.permissionDenied,
        authorizationStatus: settings.authorizationStatus,
        statusDetail:
            'OS notification permission is denied. Enable notifications in '
            'system settings to receive background push alerts.',
      );
    }

    if (settings.authorizationStatus == AuthorizationStatus.notDetermined) {
      return FcmRegistrationSnapshot(
        state: PushTransportState.permissionNotRequested,
        authorizationStatus: settings.authorizationStatus,
        statusDetail:
            'Push permission not yet requested. Tap Enable Push Alerts to '
            'register this device with FCM.',
      );
    }

    return requestPermissionAndSyncToken();
  }

  /// Requests OS notification permission and registers the real FCM device token
  /// under /users/{uid}/fcm_tokens/{deviceId}. Never fabricates a token.
  Future<FcmRegistrationSnapshot> requestPermissionAndSyncToken({
    String? webVapidKey,
  }) async {
    final supported = await _messaging.isSupported();
    if (!supported) {
      return const FcmRegistrationSnapshot(
        state: PushTransportState.unsupportedPlatform,
        statusDetail: 'FCM is unsupported on this device/browser.',
      );
    }

    final user = _auth.currentUser;
    if (user == null || !user.emailVerified) {
      return const FcmRegistrationSnapshot(
        state: PushTransportState.tokenRegistrationFailed,
        statusDetail:
            'Sign in with a verified Califnco account before registering a push token.',
      );
    }

    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus != AuthorizationStatus.authorized &&
        settings.authorizationStatus != AuthorizationStatus.provisional) {
      return FcmRegistrationSnapshot(
        state: PushTransportState.permissionDenied,
        authorizationStatus: settings.authorizationStatus,
        statusDetail:
            'Notification permission was not granted (\${settings.authorizationStatus.name}).',
      );
    }

    try {
      final token = await _messaging.getToken(
        vapidKey: kIsWeb ? webVapidKey : null,
      );
      if (token == null || token.trim().length < 20) {
        return FcmRegistrationSnapshot(
          state: PushTransportState.tokenRegistrationFailed,
          authorizationStatus: settings.authorizationStatus,
          statusDetail:
              'FCM did not return a device registration token. Verify APNs / '
              'Google Play Services / Web VAPID configuration.',
        );
      }

      final deviceId = await _persistDeviceToken(
        user: user,
        token: token.trim(),
        settings: settings,
      );

      return FcmRegistrationSnapshot(
        state: PushTransportState.authorizedTokenRegistered,
        authorizationStatus: settings.authorizationStatus,
        deviceId: deviceId,
        statusDetail:
            'Device registered with FCM (\${_platformLabel()}). Trusted backend '
            'order updates will deliver in both foreground and background.',
      );
    } catch (error) {
      return FcmRegistrationSnapshot(
        state: PushTransportState.tokenRegistrationFailed,
        authorizationStatus: settings.authorizationStatus,
        statusDetail: 'FCM token registration failed: \$error',
      );
    }
  }

  /// Must be called BEFORE FirebaseAuth.instance.signOut() so the device token
  /// is immediately removed from /users/{uid}/fcm_tokens/{deviceId}.
  Future<void> revokeCurrentDeviceTokenOnSignOut() async {
    final user = _auth.currentUser;
    if (user == null) return;
    try {
      final deviceId = await _getOrCreateDeterministicDeviceId();
      await _firestore
          .collection('users')
          .doc(user.uid)
          .collection('fcm_tokens')
          .doc(deviceId)
          .delete();
      await _messaging.deleteToken();
    } catch (e) {
      debugPrint('[FCM] Token cleanup on sign-out skipped: \$e');
    }
  }

  Future<String> _persistDeviceToken({
    required User user,
    required String token,
    required NotificationSettings settings,
  }) async {
    final deviceId = await _getOrCreateDeterministicDeviceId();
    final permissionStatus =
        settings.authorizationStatus == AuthorizationStatus.provisional
            ? 'provisional'
            : 'authorized';

    final tokenRef = _firestore
        .collection('users')
        .doc(user.uid)
        .collection('fcm_tokens')
        .doc(deviceId);

    final existing = await tokenRef.get();
    if (existing.exists) {
      await tokenRef.update({
        'fcmToken': token,
        'platform': _platformLabel(),
        'permissionStatus': permissionStatus,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } else {
      await tokenRef.set({
        'userId': user.uid,
        'deviceId': deviceId,
        'fcmToken': token,
        'platform': _platformLabel(),
        'permissionStatus': permissionStatus,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }
    return deviceId;
  }

  Future<String> _getOrCreateDeterministicDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var rawSeed = prefs.getString(_installSeedPrefsKey);
    if (rawSeed == null || rawSeed.isEmpty) {
      rawSeed =
          '\${DateTime.now().microsecondsSinceEpoch}_\${_platformLabel()}';
      await prefs.setString(_installSeedPrefsKey, rawSeed);
    }
    final digest = sha256.convert(utf8.encode(rawSeed)).toString();
    return 'dev_\${digest.substring(0, 24)}';
  }

  String _platformLabel() {
    if (kIsWeb) return 'web';
    if (defaultTargetPlatform == TargetPlatform.iOS) return 'ios';
    return 'android';
  }

  String _resolveRouteFromData(Map<String, dynamic> data) {
    final orderId = data['orderId']?.toString() ?? '';
    if (orderId.isNotEmpty) {
      return '/orders/\$orderId';
    }
    return '/notifications';
  }

  Future<void> dispose() async {
    await _tokenRefreshSub?.cancel();
    await _foregroundMessageSub?.cancel();
    await _openedAppSub?.cancel();
    await _foregroundAlertController.close();
    await _deepLinkRouteController.close();
  }
}
`,
  },

  'notifications_cubit.dart': {
    path: 'lib/features/notifications/cubit/notifications_cubit.dart',
    language: 'dart',
    content: `import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:equatable/equatable.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/notification_model.dart';
import '../services/fcm_notification_service.dart';

class NotificationsState extends Equatable {
  final bool isLoading;
  final List<AppNotificationModel> notifications;
  final FcmRegistrationSnapshot? fcmSnapshot;
  final String? errorMessage;

  const NotificationsState({
    this.isLoading = true,
    this.notifications = const [],
    this.fcmSnapshot,
    this.errorMessage,
  });

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  NotificationsState copyWith({
    bool? isLoading,
    List<AppNotificationModel>? notifications,
    FcmRegistrationSnapshot? fcmSnapshot,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationsState(
      isLoading: isLoading ?? this.isLoading,
      notifications: notifications ?? this.notifications,
      fcmSnapshot: fcmSnapshot ?? this.fcmSnapshot,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [
        isLoading,
        notifications,
        fcmSnapshot,
        errorMessage,
      ];
}

class NotificationsCubit extends Cubit<NotificationsState> {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;
  final FcmNotificationService _fcmService;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _inboxSub;

  NotificationsCubit({
    required FirebaseFirestore firestore,
    required FirebaseAuth auth,
    required FcmNotificationService fcmService,
  })  : _firestore = firestore,
        _auth = auth,
        _fcmService = fcmService,
        super(const NotificationsState());

  Future<void> initialize() async {
    emit(state.copyWith(isLoading: true, clearError: true));
    await _fcmService.initializeListeners();
    final fcmStatus = await _fcmService.inspectPermissionStatus();
    emit(state.copyWith(fcmSnapshot: fcmStatus));
    _subscribeToTrustedInbox();
  }

  void _subscribeToTrustedInbox() {
    _inboxSub?.cancel();
    final user = _auth.currentUser;
    if (user == null || !user.emailVerified) {
      emit(state.copyWith(
        isLoading: false,
        notifications: const [],
      ));
      return;
    }

    // Security Rule Enforced: resource.data.recipientUid == request.auth.uid
    _inboxSub = _firestore
        .collection('notifications')
        .where('recipientUid', isEqualTo: user.uid)
        .snapshots()
        .listen(
      (snapshot) {
        final items = snapshot.docs
            .map(AppNotificationModel.fromFirestore)
            .toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

        emit(state.copyWith(
          isLoading: false,
          notifications: items,
          clearError: true,
        ));
      },
      onError: (Object err) {
        emit(state.copyWith(
          isLoading: false,
          errorMessage: 'Unable to load notifications: \$err',
        ));
      },
    );
  }

  Future<void> requestPushPermissions({String? webVapidKey}) async {
    final snapshot = await _fcmService.requestPermissionAndSyncToken(
      webVapidKey: webVapidKey,
    );
    emit(state.copyWith(fcmSnapshot: snapshot));
  }

  /// Marks a single unread notification as read.
  /// Firestore rules enforce a one-way transition (false -> true) with
  /// server timestamps on readAt and updatedAt while keeping title/body immutable.
  Future<void> markAsRead(String notificationId) async {
    final target = state.notifications
        .where((n) => n.id == notificationId)
        .firstOrNull;
    if (target == null || target.isRead) return;

    try {
      await _firestore.collection('notifications').doc(notificationId).update({
        'isRead': true,
        'readAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (err) {
      emit(state.copyWith(
        errorMessage: 'Failed to mark notification as read: \$err',
      ));
    }
  }

  Future<void> markAllAsRead() async {
    final unread = state.notifications.where((n) => !n.isRead).toList();
    if (unread.isEmpty) return;

    try {
      final batch = _firestore.batch();
      for (final item in unread) {
        final ref = _firestore.collection('notifications').doc(item.id);
        batch.update(ref, {
          'isRead': true,
          'readAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err) {
      emit(state.copyWith(
        errorMessage: 'Failed to mark all notifications as read: \$err',
      ));
    }
  }

  @override
  Future<void> close() async {
    await _inboxSub?.cancel();
    return super.close();
  }
}
`,
  },

  'notifications_screen.dart': {
    path: 'lib/features/notifications/views/notifications_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../cubit/notifications_cubit.dart';
import '../models/notification_model.dart';
import '../services/fcm_notification_service.dart';

/// SCREEN 25: NOTIFICATIONS
/// Displays trusted backend order & service notifications with read/unread states,
/// mark-as-read actions, empty state, and honest FCM permission/registration status.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _unreadOnlyFilter = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        actions: [
          BlocBuilder<NotificationsCubit, NotificationsState>(
            builder: (context, state) {
              if (state.unreadCount == 0) {
                return const SizedBox.shrink();
              }
              return TextButton.icon(
                onPressed: () =>
                    context.read<NotificationsCubit>().markAllAsRead(),
                icon: const Icon(Icons.done_all_rounded, size: 16),
                label: const Text('Mark all read'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.accentTeal,
                  textStyle: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: BlocConsumer<NotificationsCubit, NotificationsState>(
        listener: (context, state) {
          if (state.errorMessage != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage!),
                backgroundColor: AppColors.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state.isLoading) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.accentTeal),
            );
          }

          final filtered = _unreadOnlyFilter
              ? state.notifications.where((n) => !n.isRead).toList()
              : state.notifications;

          return Column(
            children: [
              _FcmStatusBanner(
                snapshot: state.fcmSnapshot,
                onEnablePressed: () =>
                    context.read<NotificationsCubit>().requestPushPermissions(),
              ),
              Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    _FilterTabButton(
                      label: 'All (\${state.notifications.length})',
                      isSelected: !_unreadOnlyFilter,
                      onTap: () => setState(() => _unreadOnlyFilter = false),
                    ),
                    const SizedBox(width: 8),
                    _FilterTabButton(
                      label: 'Unread (\${state.unreadCount})',
                      isSelected: _unreadOnlyFilter,
                      onTap: () => setState(() => _unreadOnlyFilter = true),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? _EmptyNotificationsView(
                        isFilteredUnread: _unreadOnlyFilter,
                        onShowAll: () =>
                            setState(() => _unreadOnlyFilter = false),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          return _NotificationCard(
                            notification: item,
                            onMarkAsRead: () => context
                                .read<NotificationsCubit>()
                                .markAsRead(item.id),
                            onOpenOrder: item.orderId != null
                                ? () {
                                    if (!item.isRead) {
                                      context
                                          .read<NotificationsCubit>()
                                          .markAsRead(item.id);
                                    }
                                    context.push('/orders/\${item.orderId}');
                                  }
                                : null,
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _FcmStatusBanner extends StatelessWidget {
  final FcmRegistrationSnapshot? snapshot;
  final VoidCallback onEnablePressed;

  const _FcmStatusBanner({
    required this.snapshot,
    required this.onEnablePressed,
  });

  @override
  Widget build(BuildContext context) {
    final snap = snapshot;
    if (snap == null) return const SizedBox.shrink();

    final isRegistered = snap.isPushActive;
    final canPrompt =
        snap.state == PushTransportState.permissionNotRequested ||
            snap.state == PushTransportState.tokenRegistrationFailed;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isRegistered ? AppColors.accentTeal : AppColors.borderLight,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isRegistered
                ? Icons.notifications_active_outlined
                : Icons.notifications_paused_outlined,
            size: 20,
            color:
                isRegistered ? AppColors.accentTeal : AppColors.textSecondary,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRegistered
                      ? 'FCM Push Registered (Foreground & Background)'
                      : 'In-App Inbox Active · Push Transport Unregistered',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryNavy,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  snap.statusDetail,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          if (canPrompt) ...[
            const SizedBox(width: 8),
            TextButton(
              onPressed: onEnablePressed,
              style: TextButton.styleFrom(
                minimumSize: const Size(44, 40),
                foregroundColor: AppColors.primaryNavy,
              ),
              child: const Text(
                'Enable',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _FilterTabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterTabButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? AppColors.primaryNavy : AppColors.surfaceWhite,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          constraints: const BoxConstraints(minHeight: 40),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final AppNotificationModel notification;
  final VoidCallback onMarkAsRead;
  final VoidCallback? onOpenOrder;

  const _NotificationCard({
    required this.notification,
    required this.onMarkAsRead,
    this.onOpenOrder,
  });

  String _formatTimestamp(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '\${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '\${diff.inHours}h ago';
    final monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '\${monthNames[dt.month - 1]} \${dt.day}, \${dt.year}';
  }

  IconData _iconForEvent(NotificationEventType type) {
    switch (type) {
      case NotificationEventType.orderDispatched:
        return Icons.local_shipping_outlined;
      case NotificationEventType.orderDelivered:
        return Icons.verified_outlined;
      case NotificationEventType.orderCancelled:
        return Icons.cancel_outlined;
      case NotificationEventType.paymentSettled:
        return Icons.receipt_long_outlined;
      case NotificationEventType.serviceScheduled:
        return Icons.build_circle_outlined;
      default:
        return Icons.inventory_2_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = !notification.isRead;

    return Material(
      color: unread ? const Color(0xFFF3FAFA) : AppColors.surfaceWhite,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onOpenOrder,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: unread ? AppColors.accentTeal : AppColors.borderLight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: unread
                          ? AppColors.accentTeal.withValues(alpha: 0.14)
                          : AppColors.background,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _iconForEvent(notification.eventType),
                      size: 18,
                      color: unread
                          ? AppColors.accentTeal
                          : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                notification.title,
                                style: TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: unread
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: AppColors.primaryNavy,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              unread ? 'Unread' : 'Read',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: unread
                                    ? AppColors.accentTeal
                                    : AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          notification.body,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textSecondary,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    [
                      _formatTimestamp(notification.createdAt),
                      if (notification.orderNumber != null)
                        notification.orderNumber!,
                    ].join(' · '),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
                  if (unread)
                    TextButton(
                      onPressed: onMarkAsRead,
                      style: TextButton.styleFrom(
                        minimumSize: const Size(44, 36),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        foregroundColor: AppColors.primaryNavy,
                      ),
                      child: const Text(
                        'Mark as read',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyNotificationsView extends StatelessWidget {
  final bool isFilteredUnread;
  final VoidCallback onShowAll;

  const _EmptyNotificationsView({
    required this.isFilteredUnread,
    required this.onShowAll,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                size: 28,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              isFilteredUnread
                  ? 'All Caught Up'
                  : 'No Notifications Yet',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.primaryNavy,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              isFilteredUnread
                  ? 'You have read all order dispatch, payment, and service updates.'
                  : 'Order confirmation, dispatch tracking, and technician schedule alerts from Califnco will appear here.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            ),
            if (isFilteredUnread) ...[
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: onShowAll,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(140, 44),
                  foregroundColor: AppColors.primaryNavy,
                ),
                child: const Text('View All Notifications'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
`,
  },

  'orderNotifications.ts': {
    path: 'functions/src/orderNotifications.ts',
    language: 'typescript',
    content: `import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  'ai-studio-califnco-446b2980-82d0-4b7d-a0e2-2bbecc22b94c';

interface NotificationCopy {
  eventType: string;
  title: string;
  body: string;
}

function buildOrderNotificationCopy(
  orderNumber: string,
  prevFulfilment: string,
  nextFulfilment: string,
  prevPayment: string,
  nextPayment: string,
): NotificationCopy | null {
  if (prevFulfilment !== nextFulfilment) {
    switch (nextFulfilment) {
      case 'confirmed':
        return {
          eventType: 'order_confirmed',
          title: \`Order \${orderNumber} Confirmed\`,
          body: \`Your Califnco order \${orderNumber} has been verified and queued for quality inspection.\`,
        };
      case 'processing':
        return {
          eventType: 'order_processing',
          title: \`Preparing Order \${orderNumber}\`,
          body: \`Warehouse specialists are testing and packaging your water purification equipment for \${orderNumber}.\`,
        };
      case 'dispatched':
        return {
          eventType: 'order_dispatched',
          title: \`Order \${orderNumber} Dispatched\`,
          body: \`Your Califnco shipment \${orderNumber} has left our regional facility and is on its way.\`,
        };
      case 'delivered':
        return {
          eventType: 'order_delivered',
          title: \`Order \${orderNumber} Delivered\`,
          body: \`Order \${orderNumber} was marked delivered. You can book certified RO installation anytime from Service Booking.\`,
        };
      case 'cancelled':
        return {
          eventType: 'order_cancelled',
          title: \`Order \${orderNumber} Cancelled\`,
          body: \`Order \${orderNumber} has been cancelled. Any eligible prepaid balance is queued for refund.\`,
        };
    }
  }

  if (prevPayment !== 'paid' && nextPayment === 'paid') {
    return {
      eventType: 'payment_settled',
      title: \`Payment Settled for \${orderNumber}\`,
      body: \`Payment for Califnco order \${orderNumber} has been verified and recorded.\`,
    };
  }

  return null;
}

/**
 * Trusted Backend Cloud Function (v2):
 * Listens for verified /orders/{orderId} state transitions, writes an immutable
 * notification document to /notifications/{id}, and dispatches FCM push messages
 * ONLY to currently registered device tokens for that recipient.
 */
export const onCalifncoOrderUpdated = onDocumentUpdated(
  {
    document: 'orders/{orderId}',
    database: DATABASE_ID,
    region: 'us-central1',
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const customerUid = String(after.customerUid ?? '');
    const orderNumber = String(after.orderNumber ?? event.params.orderId);
    if (!customerUid) return;

    const copy = buildOrderNotificationCopy(
      orderNumber,
      String(before.fulfilmentStatus ?? ''),
      String(after.fulfilmentStatus ?? ''),
      String(before.paymentStatus ?? ''),
      String(after.paymentStatus ?? ''),
    );
    if (!copy) return;

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const notificationRef = db.collection('notifications').doc();

    // 1. Persist canonical in-app notification record
    await notificationRef.set({
      recipientUid: customerUid,
      title: copy.title,
      body: copy.body,
      eventType: copy.eventType,
      orderId: event.params.orderId,
      orderNumber,
      source: 'trusted_backend_order_event',
      isRead: false,
      createdAtIso: new Date().toISOString(),
      createdByUid: 'system_cloud_functions',
      createdAt: now,
      updatedAt: now,
    });

    // 2. Fetch owner-isolated FCM device tokens (/users/{uid}/fcm_tokens)
    const tokensSnap = await db
      .collection('users')
      .doc(customerUid)
      .collection('fcm_tokens')
      .get();

    if (tokensSnap.empty) {
      console.info(\`[FCM] No registered device tokens for uid=\${customerUid}; inbox stored.\`);
      return;
    }

    const tokenDocs = tokensSnap.docs.filter((d) => {
      const status = d.data().permissionStatus;
      return (status === 'authorized' || status === 'provisional') && Boolean(d.data().fcmToken);
    });
    if (tokenDocs.length === 0) return;

    const tokens = tokenDocs.map((d) => String(d.data().fcmToken));

    // 3. Dispatch real multicast FCM message and prune stale/unregistered tokens
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: copy.title,
        body: copy.body,
      },
      data: {
        notificationId: notificationRef.id,
        orderId: event.params.orderId,
        orderNumber,
        eventType: copy.eventType,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'califnco_order_updates',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    });

    const staleDeletes: Promise<FirebaseFirestore.WriteResult>[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code ?? '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          staleDeletes.push(tokenDocs[idx].ref.delete());
        }
      }
    });

    if (staleDeletes.length > 0) {
      await Promise.all(staleDeletes);
    }
  },
);
`,
  },

  'delivery_address_model.dart': {
    path: 'lib/features/location/models/delivery_address_model.dart',
    language: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:equatable/equatable.dart';

enum LocationCaptureSource {
  mapPin('map_pin', 'OpenStreetMap Pin'),
  gpsPin('gps_pin', 'Device GPS Pin'),
  manualOnly('manual_only', 'Manual Postal Entry');

  final String firestoreValue;
  final String displayLabel;
  const LocationCaptureSource(this.firestoreValue, this.displayLabel);

  static LocationCaptureSource fromString(String raw) {
    for (final item in LocationCaptureSource.values) {
      if (item.firestoreValue == raw.trim()) return item;
    }
    return LocationCaptureSource.manualOnly;
  }
}

/// Selecting a coordinate on a map NEVER automatically produces a verified
/// postal address. Client submissions are strictly persisted as
/// \`unverified_manual_entry\` and enforced by Firestore security rules.
enum AddressVerificationStatus {
  unverifiedManualEntry(
    'unverified_manual_entry',
    'User-Entered Postal Fields (Coordinate Unverified)',
  ),
  postalVerifiedBackend(
    'postal_verified_backend',
    'Postal Address Verified',
  );

  final String firestoreValue;
  final String label;
  const AddressVerificationStatus(this.firestoreValue, this.label);

  static AddressVerificationStatus fromString(String raw) {
    if (raw.trim() == 'postal_verified_backend') {
      return AddressVerificationStatus.postalVerifiedBackend;
    }
    return AddressVerificationStatus.unverifiedManualEntry;
  }
}

class DeliveryAddressModel extends Equatable {
  final String addressId;
  final String userId;
  final String label; // 'Home' | 'Work' | 'Other'
  final String recipientName;
  final String phone;
  final String streetAddress;
  final String landmark;
  final String city;
  final String state;
  final String postalCode;
  final String deliveryInstructions;
  final bool isDefault;
  final bool hasCoordinates;
  final double latitude;
  final double longitude;
  final LocationCaptureSource locationSource;
  final AddressVerificationStatus addressVerificationStatus;
  final String createdAtIso;

  const DeliveryAddressModel({
    required this.addressId,
    required this.userId,
    required this.label,
    required this.recipientName,
    required this.phone,
    required this.streetAddress,
    required this.landmark,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.deliveryInstructions,
    required this.isDefault,
    required this.hasCoordinates,
    required this.latitude,
    required this.longitude,
    required this.locationSource,
    required this.addressVerificationStatus,
    required this.createdAtIso,
  });

  factory DeliveryAddressModel.fromFirestore(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final d = doc.data() ?? const <String, dynamic>{};
    return DeliveryAddressModel(
      addressId: (d['addressId'] as String?) ?? doc.id,
      userId: (d['userId'] as String?) ?? '',
      label: (d['label'] as String?) ?? 'Home',
      recipientName: (d['recipientName'] as String?) ?? '',
      phone: (d['phone'] as String?) ?? '',
      streetAddress: (d['streetAddress'] as String?) ?? '',
      landmark: (d['landmark'] as String?) ?? '',
      city: (d['city'] as String?) ?? '',
      state: (d['state'] as String?) ?? '',
      postalCode: (d['postalCode'] as String?) ?? '',
      deliveryInstructions: (d['deliveryInstructions'] as String?) ?? '',
      isDefault: d['isDefault'] == true,
      hasCoordinates: d['hasCoordinates'] == true,
      latitude: (d['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (d['longitude'] as num?)?.toDouble() ?? 0.0,
      locationSource: LocationCaptureSource.fromString(
        (d['locationSource'] as String?) ?? 'manual_only',
      ),
      addressVerificationStatus: AddressVerificationStatus.fromString(
        (d['addressVerificationStatus'] as String?) ??
            'unverified_manual_entry',
      ),
      createdAtIso:
          (d['createdAtIso'] as String?) ?? DateTime.now().toIso8601String(),
    );
  }

  @override
  List<Object?> get props => [
        addressId,
        userId,
        label,
        recipientName,
        phone,
        streetAddress,
        landmark,
        city,
        state,
        postalCode,
        deliveryInstructions,
        isDefault,
        hasCoordinates,
        latitude,
        longitude,
        locationSource,
        addressVerificationStatus,
        createdAtIso,
      ];
}
`,
  },

  'delivery_location_repository.dart': {
    path: 'lib/features/location/repositories/delivery_location_repository.dart',
    language: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/delivery_address_model.dart';

class DeliveryLocationRepository {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  DeliveryLocationRepository({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  static Map<String, String> validateAddressFields({
    required String recipientName,
    required String phone,
    required String streetAddress,
    required String city,
    required String state,
    required String postalCode,
  }) {
    final errors = <String, String>{};

    if (recipientName.trim().length < 2 || recipientName.trim().length > 120) {
      errors['recipientName'] = 'Enter recipient full name (2–120 characters).';
    }

    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 10 ||
        digits.length > 15 ||
        phone.trim().length < 7 ||
        phone.trim().length > 24) {
      errors['phone'] = 'Enter a valid 10-digit mobile contact number.';
    }

    if (streetAddress.trim().length < 5 || streetAddress.trim().length > 240) {
      errors['streetAddress'] =
          'Enter flat/house number and street address (5–240 characters).';
    }

    if (city.trim().length < 2 || city.trim().length > 80) {
      errors['city'] = 'Enter a valid city or town.';
    }

    if (state.trim().length < 2 || state.trim().length > 80) {
      errors['state'] = 'Enter a valid state or province.';
    }

    final cleanPin = postalCode.trim();
    if (cleanPin.length < 4 ||
        cleanPin.length > 16 ||
        !RegExp(r'^[0-9A-Za-z\\- ]+$').hasMatch(cleanPin)) {
      errors['postalCode'] = 'Enter a valid postal / PIN code.';
    }

    return errors;
  }

  Stream<List<DeliveryAddressModel>> watchUserAddresses() {
    final user = _auth.currentUser;
    if (user == null || !user.emailVerified) {
      return Stream.value(const []);
    }

    return _firestore
        .collection('users')
        .doc(user.uid)
        .collection('delivery_addresses')
        .where('userId', isEqualTo: user.uid)
        .snapshots()
        .map((snap) {
      final list = snap.docs.map(DeliveryAddressModel.fromFirestore).toList();
      list.sort((a, b) {
        if (a.isDefault != b.isDefault) return a.isDefault ? -1 : 1;
        return b.createdAtIso.compareTo(a.createdAtIso);
      });
      return list;
    });
  }

  /// Persists a delivery address to /users/{uid}/delivery_addresses/{addressId}.
  /// Enforces \`addressVerificationStatus: 'unverified_manual_entry'\` so map
  /// coordinates are never treated as verified postal addresses.
  Future<DeliveryAddressModel> saveDeliveryAddress({
    required String label,
    required String recipientName,
    required String phone,
    required String streetAddress,
    required String landmark,
    required String city,
    required String state,
    required String postalCode,
    required String deliveryInstructions,
    required bool isDefault,
    required bool hasCoordinates,
    required double? latitude,
    required double? longitude,
    required LocationCaptureSource locationSource,
  }) async {
    final user = _auth.currentUser;
    if (user == null || !user.emailVerified) {
      throw StateError('Authenticated verified user required to save address.');
    }

    final validation = validateAddressFields(
      recipientName: recipientName,
      phone: phone,
      streetAddress: streetAddress,
      city: city,
      state: state,
      postalCode: postalCode,
    );
    if (validation.isNotEmpty) {
      throw ArgumentError(validation.values.first);
    }

    final useCoords = hasCoordinates &&
        latitude != null &&
        longitude != null &&
        locationSource != LocationCaptureSource.manualOnly;

    final normalizedSource =
        useCoords ? locationSource : LocationCaptureSource.manualOnly;
    final normalizedLat = useCoords ? latitude : 0.0;
    final normalizedLng = useCoords ? longitude : 0.0;

    final nowIso = DateTime.now().toUtc().toIso8601String();
    final addressId = 'addr_\${DateTime.now().millisecondsSinceEpoch}';
    final collectionRef = _firestore
        .collection('users')
        .doc(user.uid)
        .collection('delivery_addresses');

    final batch = _firestore.batch();

    if (isDefault) {
      final existingDefaults = await collectionRef
          .where('userId', isEqualTo: user.uid)
          .where('isDefault', isEqualTo: true)
          .get();
      for (final docSnap in existingDefaults.docs) {
        batch.update(docSnap.reference, {
          'isDefault': false,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    }

    final newDocRef = collectionRef.doc(addressId);
    batch.set(newDocRef, {
      'addressId': addressId,
      'userId': user.uid,
      'label': ['Home', 'Work', 'Other'].contains(label) ? label : 'Home',
      'recipientName': recipientName.trim(),
      'phone': phone.trim(),
      'streetAddress': streetAddress.trim(),
      'landmark': landmark.trim(),
      'city': city.trim(),
      'state': state.trim(),
      'postalCode': postalCode.trim(),
      'deliveryInstructions': deliveryInstructions.trim(),
      'isDefault': isDefault,
      'hasCoordinates': useCoords,
      'latitude': normalizedLat,
      'longitude': normalizedLng,
      'locationSource': normalizedSource.firestoreValue,
      'addressVerificationStatus':
          AddressVerificationStatus.unverifiedManualEntry.firestoreValue,
      'createdAtIso': nowIso,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return DeliveryAddressModel(
      addressId: addressId,
      userId: user.uid,
      label: label,
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      streetAddress: streetAddress.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      deliveryInstructions: deliveryInstructions.trim(),
      isDefault: isDefault,
      hasCoordinates: useCoords,
      latitude: normalizedLat,
      longitude: normalizedLng,
      locationSource: normalizedSource,
      addressVerificationStatus:
          AddressVerificationStatus.unverifiedManualEntry,
      createdAtIso: nowIso,
    );
  }
}
`,
  },

  'delivery_location_screen.dart': {
    path: 'lib/features/location/views/delivery_location_screen.dart',
    language: 'dart',
    content: `import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/constants/app_colors.dart';
import '../models/delivery_address_model.dart';
import '../repositories/delivery_location_repository.dart';

/// SCREEN 26: DELIVERY LOCATION
/// Provides an OpenStreetMap pin selector (\`flutter_map\`) paired with a complete
/// manual address entry fallback. Explicitly separates raw WGS84 map coordinates
/// from user-entered postal address fields without assuming postal verification.
class DeliveryLocationScreen extends StatefulWidget {
  final DeliveryLocationRepository repository;

  const DeliveryLocationScreen({
    super.key,
    required this.repository,
  });

  @override
  State<DeliveryLocationScreen> createState() => _DeliveryLocationScreenState();
}

class _DeliveryLocationScreenState extends State<DeliveryLocationScreen> {
  static const LatLng _defaultCenter = LatLng(19.0596, 72.8295); // Mumbai

  final MapController _mapController = MapController();
  final _recipientController = TextEditingController();
  final _phoneController = TextEditingController();
  final _streetController = TextEditingController();
  final _landmarkController = TextEditingController();
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _postalController = TextEditingController();
  final _instructionsController = TextEditingController();

  String _selectedLabel = 'Home';
  bool _isDefault = true;
  bool _manualFallbackMode = false;
  bool _mapTileLoadError = false;
  bool _isLocatingGps = false;
  bool _isSaving = false;

  LatLng? _selectedPin = _defaultCenter;
  LocationCaptureSource _captureSource = LocationCaptureSource.mapPin;
  Map<String, String> _fieldErrors = const {};

  @override
  void dispose() {
    _recipientController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _landmarkController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _postalController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  Future<void> _useCurrentDeviceLocation() async {
    setState(() => _isLocatingGps = true);
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showNotice(
          'Location services are disabled. Enter your address manually below.',
        );
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showNotice(
          'Location permission not granted. You can place a pin manually or use manual address entry.',
        );
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );

      final target = LatLng(pos.latitude, pos.longitude);
      setState(() {
        _manualFallbackMode = false;
        _selectedPin = target;
        _captureSource = LocationCaptureSource.gpsPin;
      });
      _mapController.move(target, 16);
    } catch (_) {
      _showNotice(
        'Could not acquire GPS fix. Continue with manual postal entry below.',
      );
    } finally {
      if (mounted) setState(() => _isLocatingGps = false);
    }
  }

  Future<void> _handleSaveAddress() async {
    if (_isSaving) return;

    final errors = DeliveryLocationRepository.validateAddressFields(
      recipientName: _recipientController.text,
      phone: _phoneController.text,
      streetAddress: _streetController.text,
      city: _cityController.text,
      state: _stateController.text,
      postalCode: _postalController.text,
    );

    setState(() => _fieldErrors = errors);
    if (errors.isNotEmpty) return;

    setState(() => _isSaving = true);
    try {
      final includeCoords =
          !_manualFallbackMode && !_mapTileLoadError && _selectedPin != null;

      await widget.repository.saveDeliveryAddress(
        label: _selectedLabel,
        recipientName: _recipientController.text,
        phone: _phoneController.text,
        streetAddress: _streetController.text,
        landmark: _landmarkController.text,
        city: _cityController.text,
        state: _stateController.text,
        postalCode: _postalController.text,
        deliveryInstructions: _instructionsController.text,
        isDefault: _isDefault,
        hasCoordinates: includeCoords,
        latitude: includeCoords ? _selectedPin!.latitude : 0.0,
        longitude: includeCoords ? _selectedPin!.longitude : 0.0,
        locationSource: includeCoords
            ? _captureSource
            : LocationCaptureSource.manualOnly,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Delivery address saved.'),
          backgroundColor: AppColors.success,
        ),
      );
      context.pop(true);
    } catch (err) {
      _showNotice('Could not save address: \$err');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showNotice(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final showMap = !_manualFallbackMode && !_mapTileLoadError;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Delivery Location',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
        ),
        backgroundColor: AppColors.surfaceWhite,
        foregroundColor: AppColors.primaryNavy,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () {
              setState(() {
                _manualFallbackMode = !_manualFallbackMode;
                if (_manualFallbackMode) {
                  _captureSource = LocationCaptureSource.manualOnly;
                } else if (_selectedPin != null) {
                  _captureSource = LocationCaptureSource.mapPin;
                }
              });
            },
            child: Text(
              _manualFallbackMode ? 'Use Map Pin' : 'Manual Only',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.accentTeal,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. OpenStreetMap Display OR Manual Entry Fallback Card
                  if (showMap)
                    _buildOpenStreetMapCard()
                  else
                    _buildManualFallbackBanner(),

                  const SizedBox(height: 12),

                  // 2. Unverified Coordinate Disclosure (Never assume postal verification)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: const Text(
                      'Selecting a map pin records GPS coordinates to assist '
                      'last-mile delivery, but does not automatically produce a '
                      'verified postal address. Please enter and confirm your '
                      'exact street address and PIN code below.',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF78350F),
                        height: 1.4,
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 3. Address Label Selector
                  Row(
                    children: ['Home', 'Work', 'Other'].map((tag) {
                      final active = _selectedLabel == tag;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(tag),
                          selected: active,
                          onSelected: (_) =>
                              setState(() => _selectedLabel = tag),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 12),

                  // 4. Postal Address Text Fields
                  _buildTextField(
                    controller: _recipientController,
                    label: 'Recipient Full Name *',
                    hint: 'e.g. Sarah Jenkins',
                    errorText: _fieldErrors['recipientName'],
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    controller: _phoneController,
                    label: 'Mobile Contact Number *',
                    hint: '+91 98765 43210',
                    keyboardType: TextInputType.phone,
                    errorText: _fieldErrors['phone'],
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    controller: _streetController,
                    label: 'Flat / House No., Building & Street *',
                    hint: 'Flat 402, Green Park Avenue, Link Road',
                    maxLines: 2,
                    errorText: _fieldErrors['streetAddress'],
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    controller: _landmarkController,
                    label: 'Nearby Landmark (Optional)',
                    hint: 'Near Metro Pillar 48',
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          controller: _cityController,
                          label: 'City / Town *',
                          hint: 'Mumbai',
                          errorText: _fieldErrors['city'],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildTextField(
                          controller: _postalController,
                          label: 'Postal / PIN Code *',
                          hint: '400050',
                          keyboardType: TextInputType.text,
                          errorText: _fieldErrors['postalCode'],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    controller: _stateController,
                    label: 'State / Province *',
                    hint: 'Maharashtra',
                    errorText: _fieldErrors['state'],
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    controller: _instructionsController,
                    label: 'Delivery & Gate Instructions (Optional)',
                    hint: 'Ring bell twice or check in at society gate',
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    value: _isDefault,
                    activeColor: AppColors.accentTeal,
                    onChanged: (val) => setState(() => _isDefault = val),
                    title: const Text(
                      'Set as default delivery address',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryNavy,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Save Address Sticky Footer
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            decoration: const BoxDecoration(
              color: AppColors.surfaceWhite,
              border: Border(top: BorderSide(color: AppColors.borderLight)),
            ),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _handleSaveAddress,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryNavy,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Save Address',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOpenStreetMapCard() {
    final pin = _selectedPin ?? _defaultCenter;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderLight),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          SizedBox(
            height: 215,
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: pin,
                    initialZoom: 14.5,
                    onTap: (_, tappedPoint) {
                      setState(() {
                        _selectedPin = tappedPoint;
                        _captureSource = LocationCaptureSource.mapPin;
                      });
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.califnco.waterpurifiers',
                      errorTileCallback: (_, __, ___) {
                        if (mounted && !_mapTileLoadError) {
                          setState(() => _mapTileLoadError = true);
                        }
                      },
                    ),
                    if (_selectedPin != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _selectedPin!,
                            width: 44,
                            height: 44,
                            child: const Icon(
                              Icons.location_on,
                              size: 40,
                              color: AppColors.primaryNavy,
                            ),
                          ),
                        ],
                      ),
                    const SimpleAttributionWidget(
                      source: Text(
                        '© OpenStreetMap contributors',
                        style: TextStyle(fontSize: 10),
                      ),
                    ),
                  ],
                ),
                Positioned(
                  right: 10,
                  bottom: 34,
                  child: FloatingActionButton.small(
                    heroTag: 'gps_locate_btn',
                    backgroundColor: AppColors.surfaceWhite,
                    foregroundColor: AppColors.primaryNavy,
                    onPressed:
                        _isLocatingGps ? null : _useCurrentDeviceLocation,
                    child: _isLocatingGps
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.my_location_rounded, size: 18),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _selectedPin != null
                      ? 'Pin: \${_selectedPin!.latitude.toStringAsFixed(5)}, '
                          '\${_selectedPin!.longitude.toStringAsFixed(5)}'
                      : 'Tap map to place delivery pin',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryNavy,
                  ),
                ),
                if (_selectedPin != null)
                  GestureDetector(
                    onTap: () => setState(() {
                      _selectedPin = null;
                      _captureSource = LocationCaptureSource.manualOnly;
                    }),
                    child: const Text(
                      'Clear Pin',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.accentTeal,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManualFallbackBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.edit_location_alt_outlined,
            color: AppColors.primaryNavy,
            size: 22,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _mapTileLoadError
                      ? 'Map Tiles Unavailable — Manual Entry Active'
                      : 'Manual Address Entry Mode',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryNavy,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'No map coordinates will be attached. Complete the postal '
                  'address fields below to save your delivery destination.',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: AppColors.textSecondary,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          if (_mapTileLoadError)
            TextButton(
              onPressed: () => setState(() {
                _mapTileLoadError = false;
                _manualFallbackMode = false;
              }),
              child: const Text('Retry Map'),
            ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    String? errorText,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 13.5, color: AppColors.primaryNavy),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        errorText: errorText,
        filled: true,
        fillColor: AppColors.surfaceWhite,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
      ),
    );
  }
}
`,
  },

  'notifications_location_routes.dart': {
    path: 'lib/core/router/notifications_location_routes.dart',
    language: 'dart',
    content: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/location/repositories/delivery_location_repository.dart';
import '../../features/location/views/delivery_location_screen.dart';
import '../../features/notifications/cubit/notifications_cubit.dart';
import '../../features/notifications/services/fcm_notification_service.dart';
import '../../features/notifications/views/notifications_screen.dart';

/// GoRouter registrations for Screen 25 (/notifications) and Screen 26 (/delivery-location),
/// plus required pubspec.yaml dependencies and native Android/iOS permissions.
List<GoRoute> buildNotificationsAndLocationRoutes({
  required FirebaseFirestore firestore,
  required FirebaseAuth auth,
  required FcmNotificationService fcmService,
}) {
  return [
    GoRoute(
      path: '/notifications',
      name: 'notifications',
      builder: (context, state) {
        return BlocProvider(
          create: (_) => NotificationsCubit(
            firestore: firestore,
            auth: auth,
            fcmService: fcmService,
          )..initialize(),
          child: const NotificationsScreen(),
        );
      },
    ),
    GoRoute(
      path: '/delivery-location',
      name: 'delivery_location',
      builder: (context, state) {
        return DeliveryLocationScreen(
          repository: DeliveryLocationRepository(
            firestore: firestore,
            auth: auth,
          ),
        );
      },
    ),
  ];
}

/*
===============================================================================
REQUIRED PUBSPEC.YAML DEPENDENCIES
===============================================================================
dependencies:
  firebase_core: ^3.12.1
  firebase_auth: ^5.5.1
  cloud_firestore: ^5.6.5
  firebase_messaging: ^15.2.4
  flutter_local_notifications: ^18.0.1
  flutter_map: ^7.0.2
  latlong2: ^0.9.1
  geolocator: ^13.0.2
  crypto: ^3.0.6
  shared_preferences: ^2.5.2

===============================================================================
ANDROID PERMISSIONS (android/app/src/main/AndroidManifest.xml)
===============================================================================
<uses-permission android:name="android.permission.INTERNET" />
<!-- Android 13+ (API 33+) runtime notification permission -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<!-- Optional GPS pin assist on Screen 26 (manual address fallback works if denied) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<application ...>
  <meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="califnco_order_updates" />
</application>

===============================================================================
iOS PERMISSIONS & CAPABILITIES (ios/Runner/Info.plist & Xcode Signing)
===============================================================================
1. Enable "Push Notifications" capability and "Background Modes -> Remote notifications" in Xcode.
2. Upload APNs Auth Key (.p8) in Firebase Console -> Project Settings -> Cloud Messaging.
3. Add location usage description in ios/Runner/Info.plist:
<key>NSLocationWhenInUseUsageDescription</key>
<string>Califnco uses your location only when you tap Locate Me to place a delivery pin on the map. You can always enter your postal address manually.</string>
*/
`,
  },
};
