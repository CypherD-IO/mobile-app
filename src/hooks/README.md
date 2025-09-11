# Generic Polling System

A flexible, reusable polling system that can be adapted for any type of data that needs real-time updates.

## Architecture

### Core Hook: `useGenericPolling<T>`

The base generic hook that provides:

- ✅ **Configurable polling intervals**
- ✅ **Automatic focus-based data fetching**
- ✅ **Individual item status updates**
- ✅ **Completion handling**
- ✅ **Duplicate prevention**
- ✅ **Customizable merge strategies**
- ✅ **TypeScript generic support**

### Specialized Hooks

Built on top of the generic hook for specific use cases:

1. **`useActivityPolling`** - For card funding activities
2. **`useNotificationPolling`** - For user notifications (example)

## Usage Examples

### 1. Activity Polling (Current Implementation)

```typescript
import { useActivityPolling } from '../hooks/useActivityPolling';

const MyComponent = () => {
  const [activities, setActivities] = useState<CardFundResponse[]>([]);
  const [completedActivities, setCompletedActivities] = useState<CardFundResponse[]>([]);

  const handleActivityCompleted = (activity: CardFundResponse) => {
    setCompletedActivities(prev => [activity, ...prev]);
  };

  // Use the activity-specific polling hook
  useActivityPolling({
    ongoingActivities: activities,
    setOngoingActivities: setActivities,
    onActivityCompleted: handleActivityCompleted,
    pollingInterval: 30000, // 30 seconds
    enabled: true,
  });

  return (
    // Your UI here
  );
};
```

### 2. Notification Polling (Example)

```typescript
import { useNotificationPolling } from '../hooks/useNotificationPolling';

const NotificationComponent = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleNotificationDismissed = (notification: Notification) => {
    console.log('Notification dismissed:', notification.id);
  };

  // Use the notification-specific polling hook
  const { isPolling, isFetching } = useNotificationPolling({
    notifications,
    setNotifications,
    onNotificationDismissed: handleNotificationDismissed,
    pollingInterval: 60000, // 1 minute
    enabled: true,
  });

  return (
    <div>
      {isPolling && <span>🔄 Polling notifications...</span>}
      {notifications.map(notification => (
        <div key={notification.id}>{notification.message}</div>
      ))}
    </div>
  );
};
```

### 3. Custom Polling Hook

Create your own specialized hook for any data type:

```typescript
import { useGenericPolling } from './useGenericPolling';

interface MyDataType {
  id: string;
  status: 'pending' | 'processing' | 'completed';
  // ... other properties
}

export const useMyDataPolling = ({
  data,
  setData,
  onCompleted,
}: {
  data: MyDataType[];
  setData: (data: MyDataType[]) => void;
  onCompleted?: (item: MyDataType) => void;
}) => {
  const fetchData = async (): Promise<MyDataType[]> => {
    // Your API call here
    const response = await api.get('/my-data');
    return response.data;
  };

  const fetchItemUpdate = async (
    item: MyDataType,
  ): Promise<MyDataType | null> => {
    // Your individual item update API call
    const response = await api.get(`/my-data/${item.id}`);
    return response.data;
  };

  const getItemId = (item: MyDataType): string => item.id;
  const isItemCompleted = (item: MyDataType): boolean =>
    item.status === 'completed';

  return useGenericPolling<MyDataType>({
    enabled: true,
    pollingInterval: 15000, // 15 seconds
    fetchInitialData: fetchData,
    fetchItemUpdate: fetchItemUpdate,
    getItemId: getItemId,
    isItemCompleted: isItemCompleted,
    onDataUpdate: setData,
    onItemCompleted: onCompleted,
    currentData: data,
    logPrefix: 'MyData',
  });
};
```

## Configuration Options

### GenericPollingConfig<T>

| Property           | Type                                   | Default     | Description                            |
| ------------------ | -------------------------------------- | ----------- | -------------------------------------- |
| `enabled`          | `boolean`                              | `true`      | Whether polling is enabled             |
| `pollingInterval`  | `number`                               | `30000`     | Polling interval in milliseconds       |
| `fetchInitialData` | `() => Promise<T[]>`                   | Required    | Function to fetch initial data         |
| `fetchItemUpdate`  | `(item: T) => Promise<T \| null>`      | Required    | Function to fetch item updates         |
| `getItemId`        | `(item: T) => string \| number`        | Required    | Function to get unique item ID         |
| `isItemCompleted`  | `(item: T) => boolean`                 | Required    | Function to check if item is completed |
| `onDataUpdate`     | `(data: T[]) => void`                  | Required    | Callback when data is updated          |
| `onItemCompleted`  | `(item: T) => void`                    | Optional    | Callback when item is completed        |
| `mergeData`        | `(existing: T[], newData: T[]) => T[]` | Optional    | Custom merge strategy                  |
| `currentData`      | `T[]`                                  | Required    | Current data array                     |
| `logPrefix`        | `string`                               | `'Generic'` | Custom logging prefix                  |

## Features

### 🎯 **Focus-Based Fetching**

- Automatically fetches fresh data when user navigates to the screen
- Prevents unnecessary API calls when app is in background

### 🔄 **Smart Polling**

- Only polls when there are items to poll
- Stops polling when screen loses focus
- Configurable intervals for different use cases

### 🚫 **Duplicate Prevention**

- Prevents multiple simultaneous API requests
- Intelligent merging of existing and new data
- Customizable merge strategies

### 📊 **Real-time Updates**

- Individual item status polling
- Automatic completion handling
- Status change logging

### 🧹 **Memory Management**

- Proper cleanup on unmount
- Ref-based state management to prevent dependency loops
- Efficient re-render prevention

## Best Practices

1. **Use appropriate polling intervals**:

   - Critical data: 10-15 seconds
   - Regular updates: 30 seconds
   - Background data: 1-2 minutes

2. **Implement proper error handling** in your fetch functions

3. **Use meaningful log prefixes** for debugging

4. **Customize merge strategies** based on your data requirements

5. **Handle completion callbacks** to update UI appropriately

## Migration from Old System

If you have existing polling code, follow these steps:

1. **Identify your data type** and required operations
2. **Create fetch functions** for initial data and individual updates
3. **Define completion logic** for your data
4. **Replace old polling code** with the new hook
5. **Test thoroughly** with different scenarios

## Performance Benefits

- ✅ **67% fewer API calls** with 30s vs 10s intervals
- ✅ **Zero duplicate requests** with built-in throttling
- ✅ **Memory efficient** with ref-based state management
- ✅ **Battery friendly** by stopping when not focused
- ✅ **Type safe** with full TypeScript support
