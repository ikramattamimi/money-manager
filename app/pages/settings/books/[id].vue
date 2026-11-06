<script setup lang="ts">
import { Check, Copy, Share2 } from '@lucide/vue';
import Avatar from '@/components/data/Avatar.vue';
import FieldRow from '@/components/data/FieldRow.vue';
import { FIELD_INPUT } from '@/components/data/field';
import EmptyCard from '@/components/ios/EmptyCard.vue';
import GroupRow from '@/components/ios/GroupRow.vue';
import GroupedList from '@/components/ios/GroupedList.vue';
import IconButton from '@/components/ios/IconButton.vue';
import IosButton from '@/components/ios/IosButton.vue';
import IosSheet from '@/components/ios/IosSheet.vue';
import NavBar from '@/components/ios/NavBar.vue';
import Segmented from '@/components/ios/Segmented.vue';
import MonthStartSheet from '@/components/money/MonthStartSheet.vue';
import { booksApi, type BookInvite, type BookMember, type BookRole } from '@/features/books/api';
import { monthStartCaption } from '@/features/books/monthStart';
import { useActiveBook } from '@/features/books/useActiveBook';
import {
  inviteLink,
  ROLE_HINT,
  ROLE_LABEL,
  useBookInvites,
  useBookMembers,
  useBookMutations,
} from '@/features/books/useBookAdmin';
import { MONTHS_SHORT } from '@/lib/time';

// Atur satu buku: nama, tanggal awal bulan, anggota dan peran, undangan,
// keluar, hapus. Peran ditegakkan RLS dan trigger; layar ini hanya
// menyembunyikan tombol. Keluarkan anggota dan hapus buku tidak bisa
// diurungkan, jadi lewat IosAlert.
definePageMeta({ layout: 'app' });

const route = useRoute();
const id = computed(() => String(route.params.id));
const { books, bookId: activeId, setActiveBook } = useActiveBook();
const book = computed(() => books.value?.find((b) => b.id === id.value) ?? null);
const isOwner = computed(() => book.value?.role === 'owner');
useHead({ title: () => `${book.value?.name ?? 'Buku'} · Money Manager` });

const members = useBookMembers(id);
const invites = useBookInvites(id, isOwner);
const mutations = useBookMutations();
const toast = useToast();
const alert = useAlert();

const owners = computed(() => (members.data.value ?? []).filter((m) => m.role === 'owner').length);
const me = computed(() => members.data.value?.find((m) => m.is_me) ?? null);
const canLeave = computed(() => !!me.value && (me.value.role !== 'owner' || owners.value > 1));

function openBook() {
  if (!book.value) return;
  setActiveBook(book.value.id);
  toast.show(`Buku ${book.value.name} dibuka`);
}

// ---------- nama ----------
const name = ref('');
watch(book, (b) => b && !name.value && (name.value = b.name), { immediate: true });
const nameChanged = computed(() => !!name.value.trim() && name.value.trim() !== book.value?.name);
function rename() {
  const value = name.value.trim();
  if (!value || !book.value || value === book.value.name) return;
  mutations.rename.mutate(
    { id: id.value, name: value },
    { onSuccess: () => toast.show('Nama buku disimpan') },
  );
}

// ---------- tanggal awal bulan ----------
const startOpen = ref(false);

// ---------- anggota: lembar peran ----------
const ROLES: BookRole[] = ['owner', 'editor', 'viewer'];
const member = ref<BookMember | null>(null);
const memberOpen = computed({
  get: () => !!member.value,
  set: (v) => !v && (member.value = null),
});
const canManage = (m: BookMember) => isOwner.value && !(m.is_me && owners.value <= 1);
function setRole(m: BookMember, role: BookRole) {
  member.value = null;
  if (role === m.role) return;
  mutations.setRole.mutate(
    { bookId: id.value, userId: m.user_id, role },
    { onSuccess: () => toast.show(`${m.display_name} sekarang ${ROLE_LABEL[role].toLowerCase()}`) },
  );
}
async function remove(m: BookMember) {
  member.value = null;
  const ok = await alert.confirm(
    m.is_me
      ? {
          title: 'Keluar dari buku ini?',
          body: 'Transaksi yang sudah kamu catat tetap ada. Kamu tidak bisa melihat buku ini lagi sampai diundang ulang.',
          okLabel: 'Keluar',
          danger: true,
        }
      : {
          title: `Keluarkan ${m.display_name}?`,
          body: 'Transaksi yang sudah dicatatnya tetap ada. Kamu bisa mengundangnya lagi nanti.',
          okLabel: 'Keluarkan',
          danger: true,
        },
  );
  if (!ok) return;
  mutations.removeMember.mutate(
    { bookId: id.value, userId: m.user_id },
    {
      onSuccess: () => {
        if (m.is_me) {
          toast.show(`Kamu keluar dari ${book.value?.name ?? 'buku'}`);
          navigateTo('/settings/books', { replace: true });
        } else toast.show(`${m.display_name} dikeluarkan`);
      },
    },
  );
}

// ---------- undangan ----------
const INVITE_ROLES = [
  { value: 'editor', label: ROLE_LABEL.editor },
  { value: 'viewer', label: ROLE_LABEL.viewer },
] as const;
const inviteEmail = ref('');
const inviteRole = ref<'editor' | 'viewer'>('editor');
const inviteError = ref('');
const lastInvite = ref<{ invite: BookInvite; emailed: boolean } | null>(null);

function sendInvite() {
  const email = inviteEmail.value.trim().toLowerCase();
  inviteError.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Isi email yang benar.';
  if (inviteError.value) return;
  mutations.invite.mutate(
    { bookId: id.value, email, role: inviteRole.value },
    {
      onSuccess: async (invite) => {
        inviteEmail.value = '';
        const emailed = await booksApi.sendInviteEmail(invite.id);
        lastInvite.value = { invite, emailed };
        toast.show(emailed ? `Undangan dikirim ke ${email}` : 'Undangan dibuat. Bagikan link-nya.');
      },
      onError: (error) => (inviteError.value = error.message),
    },
  );
}

async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(inviteLink(token));
    toast.show('Link undangan disalin');
  } catch {
    toast.show('Tidak bisa menyalin otomatis. Tekan lama link-nya untuk menyalin.');
  }
}
const canShare = import.meta.client && typeof navigator.share === 'function';
function shareLink(token: string) {
  navigator
    .share({
      title: `Undangan buku ${book.value?.name ?? ''}`,
      text: `Ayo catat keuangan bareng di buku ${book.value?.name ?? ''}.`,
      url: inviteLink(token),
    })
    .catch(() => {});
}
const expires = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

// ---------- hapus buku ----------
const isLastBook = computed(() => (books.value?.length ?? 0) <= 1);
async function deleteBook() {
  const deleted = book.value?.name ?? 'Buku';
  const ok = await alert.confirm({
    title: `Hapus buku ${deleted}?`,
    body: 'Semua akun, kategori, transaksi, bookmark, dan budget di buku ini dihapus permanen untuk semua anggota. Ini tidak bisa diurungkan.',
    okLabel: 'Hapus',
    danger: true,
  });
  if (!ok) return;
  mutations.remove.mutate(id.value, {
    onSuccess: () => {
      toast.show(`Buku ${deleted} dihapus`);
      navigateTo('/settings/books', { replace: true });
    },
  });
}
</script>

<template>
  <div
    class="-mx-3 -mt-[calc(env(safe-area-inset-top,0px)+8px)] md:mx-auto md:mt-0 md:max-w-[680px] md:overflow-hidden md:rounded-2xl"
  >
    <NavBar
      :title="book?.name ?? 'Buku'"
      back="Buku"
      back-to="/settings/books"
      line
      class="sticky top-0 md:static"
    >
      <template #right>
        <button
          v-if="book && book.id !== activeId"
          type="button"
          class="h-11 px-3 text-bar font-semibold text-primary-accent active:opacity-50"
          @click="openBook"
        >
          Buka
        </button>
      </template>
    </NavBar>

    <EmptyCard
      v-if="!book && !members.isPending.value"
      title="Buku tidak ditemukan"
      description="Mungkin sudah dihapus atau kamu sudah keluar."
    />

    <div v-else class="pb-8">
      <GroupedList label="Buku">
        <FieldRow v-if="isOwner" label="Nama" for="book-rename" :label-width="64">
          <input
            id="book-rename"
            v-model="name"
            type="text"
            maxlength="60"
            enterkeyhint="done"
            :class="FIELD_INPUT"
            autocomplete="off"
            @keydown.enter.prevent="rename"
          />
          <button
            v-if="nameChanged"
            type="button"
            class="shrink-0 text-body font-semibold text-primary-accent active:opacity-50"
            @click="rename"
          >
            Simpan
          </button>
        </FieldRow>
        <GroupRow v-else title="Nama" :value="book?.name" />
        <GroupRow
          title="Tanggal awal bulan"
          :subtitle="monthStartCaption(book?.month_start_day ?? 1)"
          :value="String(book?.month_start_day ?? 1)"
          :chevron="isOwner"
          v-on="isOwner ? { click: () => (startOpen = true) } : {}"
        />
      </GroupedList>
      <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
        Tanggal awal bulan berlaku untuk semua anggota: transaksi, statistik, dan budget.<template
          v-if="!isOwner"
        >
          Hanya pemilik yang bisa mengubahnya.</template
        >
      </p>

      <!-- Anggota -->
      <GroupedList label="Anggota" :aside="`${members.data.value?.length ?? 0} orang`">
        <GroupRow v-if="members.isPending.value" title="Memuat anggota…" />
        <GroupRow
          v-for="m in members.data.value"
          :key="m.user_id"
          :title="m.is_me ? `${m.display_name} (kamu)` : m.display_name"
          :subtitle="m.email ?? undefined"
          :value="ROLE_LABEL[m.role]"
          :chevron="canManage(m)"
          :inset="64"
          v-on="canManage(m) ? { click: () => (member = m) } : {}"
        >
          <template #icon><Avatar :name="m.display_name" :url="m.avatar_url" /></template>
        </GroupRow>
      </GroupedList>

      <!-- Undang -->
      <template v-if="isOwner">
        <GroupedList label="Undang anggota">
          <FieldRow label="Email" for="invite-email" :error="inviteError" :label-width="64">
            <input
              id="invite-email"
              v-model="inviteEmail"
              type="email"
              inputmode="email"
              autocomplete="off"
              autocapitalize="off"
              enterkeyhint="send"
              :class="FIELD_INPUT"
              placeholder="nama@email.com"
              :aria-invalid="!!inviteError || undefined"
              @keydown.enter.prevent="sendInvite"
            />
          </FieldRow>
          <GroupRow>
            <Segmented v-model="inviteRole" :options="INVITE_ROLES" label="Peran" />
            <span class="pt-1.5 text-meta text-muted-foreground">{{ ROLE_HINT[inviteRole] }}.</span>
          </GroupRow>
        </GroupedList>
        <p class="mx-8 mt-2 text-meta leading-[1.45] text-muted-foreground">
          Penerima masuk ke app dengan email ini untuk menerima undangan.
        </p>
        <div class="px-4 pt-3">
          <IosButton block :disabled="mutations.invite.isPending.value" @click="sendInvite"
            >Undang</IosButton
          >
        </div>

        <section
          v-if="lastInvite"
          class="mx-4 mt-3.5 flex flex-col gap-2.5 rounded-group bg-card p-4"
          aria-live="polite"
        >
          <span class="text-label">
            {{
              lastInvite.emailed
                ? `Email undangan terkirim ke ${lastInvite.invite.email}.`
                : `Kirim link ini ke ${lastInvite.invite.email} (WhatsApp, dsb.):`
            }}
          </span>
          <code
            class="select-all break-all rounded-[10px] bg-fill px-2.5 py-2 font-mono text-meta"
            >{{ inviteLink(lastInvite.invite.token) }}</code
          >
          <div class="flex gap-2">
            <IosButton variant="gray" class="flex-1" @click="copyLink(lastInvite.invite.token)"
              ><Copy aria-hidden="true" />Salin link</IosButton
            >
            <IosButton
              v-if="canShare"
              variant="gray"
              class="flex-1"
              @click="shareLink(lastInvite.invite.token)"
              ><Share2 aria-hidden="true" />Bagikan</IosButton
            >
          </div>
        </section>

        <GroupedList
          v-if="invites.data.value?.length"
          label="Menunggu diterima"
          :aside="`${invites.data.value.length} undangan`"
        >
          <GroupRow
            v-for="inv in invites.data.value"
            :key="inv.id"
            :title="inv.email"
            :subtitle="`${ROLE_LABEL[inv.role]} · berlaku sampai ${expires(inv.expires_at)}`"
          >
            <template #end>
              <IconButton
                :label="`Salin link undangan ${inv.email}`"
                accent
                @click="copyLink(inv.token)"
                ><Copy
              /></IconButton>
              <button
                type="button"
                class="shrink-0 px-1 text-body font-semibold text-exp active:opacity-50"
                :aria-label="`Batalkan undangan ${inv.email}`"
                @click="
                  mutations.cancelInvite.mutate(inv.id, {
                    onSuccess: () => toast.show('Undangan dibatalkan'),
                  })
                "
              >
                Batalkan
              </button>
            </template>
          </GroupRow>
        </GroupedList>
      </template>

      <!-- Keluar / hapus -->
      <GroupedList class="mt-[26px]">
        <GroupRow
          v-if="me"
          :class="!canLeave && 'opacity-60'"
          v-on="canLeave ? { click: () => me && remove(me) } : {}"
        >
          <b class="text-row font-medium text-exp">Keluar dari buku ini</b>
          <span class="truncate text-meta text-muted-foreground">{{
            canLeave
              ? 'Kamu tidak bisa melihat buku ini lagi sampai diundang ulang'
              : 'Jadikan anggota lain pemilik dulu'
          }}</span>
        </GroupRow>
        <GroupRow
          v-if="isOwner"
          :class="isLastBook && 'opacity-60'"
          v-on="isLastBook ? {} : { click: deleteBook }"
        >
          <b class="text-row font-medium text-exp">Hapus buku</b>
          <span class="truncate text-meta text-muted-foreground">{{
            isLastBook
              ? 'Buku satu-satunya tidak bisa dihapus'
              : 'Semua akun, kategori, dan transaksinya ikut terhapus'
          }}</span>
        </GroupRow>
      </GroupedList>
    </div>

    <MonthStartSheet
      v-if="book"
      v-model:open="startOpen"
      :book-id="book.id"
      :current="book.month_start_day"
    />

    <IosSheet v-model:open="memberOpen" :title="member ? `Peran ${member.display_name}` : ''">
      <div v-if="member" class="overflow-hidden rounded-group bg-background">
        <GroupRow
          v-for="r in ROLES"
          :key="r"
          :title="ROLE_LABEL[r]"
          :subtitle="ROLE_HINT[r]"
          @click="member && setRole(member, r)"
        >
          <template #end>
            <Check
              v-if="member.role === r"
              class="size-5 shrink-0 text-primary-accent"
              stroke-width="2.6"
              aria-hidden="true"
            />
          </template>
        </GroupRow>
      </div>
      <template v-if="member && !member.is_me" #footer>
        <IosButton block variant="red" @click="member && remove(member)"
          >Keluarkan dari buku</IosButton
        >
      </template>
    </IosSheet>
  </div>
</template>
