import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing, useTheme } from '@/theme';

/** The app's small set of building blocks; screens use these rather than raw styles. */

export function AppText({ muted, bold, size = 15, style, ...props }: TextProps & { muted?: boolean; bold?: boolean; size?: number }) {
  const theme = useTheme();
  return (
    <Text
      {...props}
      style={[{ color: muted ? theme.textMuted : theme.text, fontSize: size, fontWeight: bold ? '600' : '400' }, style]}
    />
  );
}

/** A section title, with an optional link on the right (e.g. "See all"). */
export function Heading({
  children,
  style,
  action,
}: {
  children: ReactNode;
  style?: ViewStyle;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <View style={[{ marginTop: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}>
      <AppText size={18} bold style={{ flexShrink: 1 }}>
        {children}
      </AppText>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} accessibilityRole="button">
          <AppText bold style={{ color: theme.primary }}>{action.label}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'link';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const colors = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    outline: { bg: 'transparent', fg: theme.primary, border: theme.primary },
    danger: { bg: 'transparent', fg: theme.danger, border: theme.danger },
    link: { bg: 'transparent', fg: theme.primary, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.bg, borderColor: colors.border, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'link' && { paddingVertical: spacing.sm, minHeight: 0 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={colors.fg} /> : <AppText style={{ color: colors.fg }} bold>{title}</AppText>}
    </Pressable>
  );
}

export function TextField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText muted size={13} style={{ marginBottom: spacing.xs }}>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={theme.textMuted}
        {...props}
        style={[styles.input, { borderColor: error ? theme.danger : theme.border, color: theme.text }, props.style]}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <AppText size={13} style={{ color: theme.danger, marginTop: spacing.xs }}>{children}</AppText>;
}

/** A select box that opens a list to choose from. */
export function SelectField<T>({
  label,
  value,
  options,
  getLabel,
  getKey,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: T | null | undefined;
  options: T[];
  getLabel: (option: T) => string;
  getKey: (option: T) => string | number;
  onChange: (option: T) => void;
  error?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <AppText muted size={13} style={{ marginBottom: spacing.xs }}>
        {label}
      </AppText>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.input, { borderColor: error ? theme.danger : theme.border, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }]}>
        <AppText muted={!value}>{value ? getLabel(value) : t('common.choose')}</AppText>
      </Pressable>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.row, { padding: spacing.lg, justifyContent: 'space-between' }]}>
            <AppText size={18} bold>{label}</AppText>
            <Button title={t('common.close')} variant="link" onPress={() => setOpen(false)} />
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => String(getKey(o))}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                style={{ padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
                <AppText bold={!!value && getKey(value) === getKey(item)}>{getLabel(item)}</AppText>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <AppText muted style={{ textAlign: 'center', marginBottom: spacing.md }}>
        {message ?? t('common.noConnection')}
      </AppText>
      {onRetry ? <Button title={t('common.retry')} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function Empty({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <View style={styles.center}>
      <AppText muted style={{ textAlign: 'center', marginBottom: spacing.md }}>
        {message}
      </AppText>
      {action}
    </View>
  );
}

/** A summary line: label on the left, amount on the right. */
export function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', paddingVertical: spacing.xs }]}>
      <AppText bold={bold} style={color ? { color } : undefined}>{label}</AppText>
      <AppText bold={bold} style={color ? { color } : undefined}>{value}</AppText>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md }, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? theme.primary : theme.background,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
      }}>
      <AppText size={13} style={{ color: selected ? theme.onPrimary : theme.text }}>{label}</AppText>
    </Pressable>
  );
}

/** Rupees as the website prints them: whole amounts without paisa. */
export function formatRs(amount: number): string {
  const whole = Number.isInteger(Math.round(amount * 100) / 100);
  return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  screen: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
