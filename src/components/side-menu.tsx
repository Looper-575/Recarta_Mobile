import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { useCategories, useMenus, useSettings } from '@/hooks/queries';
import { findBySlug, openStoreLink } from '@/lib/links';
import type { Category, MenuLink } from '@/lib/types';
import { spacing, useTheme } from '@/theme';

/** Opens a header or footer link on the app's own screen where it has one. */
function openMenuLink(link: MenuLink, categories: Category[]) {
  if (link.type === 'page' && link.slug) {
    router.push({ pathname: '/page/[slug]', params: { slug: link.slug } });
  } else if (link.type === 'brand' && link.slug) {
    router.push({ pathname: '/brand/[slug]', params: { slug: link.slug, title: link.title } });
  } else if (link.type === 'product' && link.id) {
    router.push({ pathname: '/product/[id]', params: { id: String(link.id) } });
  } else if (link.type === 'category' && link.slug && findBySlug(categories, link.slug)) {
    const c = findBySlug(categories, link.slug)!;
    router.push({ pathname: '/category/[id]', params: { id: String(c.id), title: c.title } });
  } else if (link.url) {
    openStoreLink(link.url, categories);
  }
}

/** "ri-facebook-fill" -> "Facebook": the website's icon class names the network. */
function socialName(icon: string | null, title: string | null): string {
  if (title) return title;
  const name = (icon ?? '').replace(/^ri-/, '').replace(/-(fill|line)$/, '').replace(/-/g, ' ');
  return name ? name[0].toUpperCase() + name.slice(1) : '';
}

/**
 * The ☰ button and the menu it opens from the left: the website's header menu, then
 * its footer (link columns, contact details, social links), all set up in the admin.
 */
export function SideMenu() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menus = useMenus();
  const { data: settings } = useSettings();
  const categories = useCategories().data ?? [];

  const go = (link: MenuLink) => {
    setOpen(false);
    openMenuLink(link, categories);
  };
  const store = settings?.store;

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t('menu.open')} hitSlop={8} onPress={() => setOpen(true)} style={styles.button}>
        <AppText size={24}>☰</AppText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <SafeAreaView style={[styles.panel, { backgroundColor: theme.background }]}>
            <View style={[styles.top, { borderColor: theme.border }]}>
              {store?.logo ? (
                <Image source={store.logo} style={styles.logo} contentFit="contain" />
              ) : (
                <AppText size={18} bold>{store?.name}</AppText>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8} onPress={() => setOpen(false)}>
                <AppText size={22} muted>✕</AppText>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
              {menus.data?.header.map((m, i) => (
                <View key={i}>
                  <Row label={m.title} onPress={() => go(m)} bold />
                  {m.children.map((c, j) => (
                    <Row key={j} label={c.title} onPress={() => go(c)} indent />
                  ))}
                </View>
              ))}

              {menus.data?.footer.sections.map((s, i) => (
                <View key={i} style={[styles.section, { borderColor: theme.border }]}>
                  <AppText size={12} bold muted style={styles.sectionTitle}>{s.title.toUpperCase()}</AppText>
                  {s.links.map((l, j) => (
                    <Row key={j} label={l.title} onPress={() => go(l)} />
                  ))}
                </View>
              ))}

              {store?.address || store?.phone || store?.email ? (
                <View style={[styles.section, { borderColor: theme.border }]}>
                  <AppText size={12} bold muted style={styles.sectionTitle}>{t('menu.contact').toUpperCase()}</AppText>
                  {store.address ? <AppText style={styles.contact}>⌖  {store.address}</AppText> : null}
                  {store.phone ? <Row label={`☎  ${store.phone}`} onPress={() => Linking.openURL(`tel:${store.phone}`)} /> : null}
                  {store.email ? <Row label={`✉  ${store.email}`} onPress={() => Linking.openURL(`mailto:${store.email}`)} /> : null}
                </View>
              ) : null}

              {menus.data?.footer.socials.length ? (
                <View style={[styles.section, { borderColor: theme.border }]}>
                  <AppText size={12} bold muted style={styles.sectionTitle}>{t('menu.follow').toUpperCase()}</AppText>
                  <View style={styles.socials}>
                    {menus.data.footer.socials.map((s, i) =>
                      s.url ? (
                        <Pressable key={i} onPress={() => Linking.openURL(s.url!)} style={[styles.social, { borderColor: theme.border }]}>
                          <AppText size={13}>{socialName(s.icon, s.title)}</AppText>
                        </Pressable>
                      ) : null,
                    )}
                  </View>
                </View>
              ) : null}

              {menus.data?.footer.description ? (
                <AppText muted size={13} style={{ padding: spacing.lg }}>{menus.data.footer.description}</AppText>
              ) : null}
            </ScrollView>
          </SafeAreaView>
          {/* Tapping beside the panel closes it. */}
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')} />
        </View>
      </Modal>
    </>
  );
}

function Row({ label, onPress, bold, indent }: { label: string; onPress: () => void; bold?: boolean; indent?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.row, indent && { paddingLeft: spacing.xxl }]}>
      <AppText bold={bold} muted={indent} size={indent ? 14 : 15}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingRight: spacing.xs },
  backdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: { width: '82%', maxWidth: 360 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  logo: { width: 120, height: 36 },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  section: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.sm },
  sectionTitle: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, letterSpacing: 0.5 },
  contact: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  socials: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  social: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6 },
});
