<script setup lang="ts">
import { ArrowLeft, BookOpen, Copy, LogOut, Mail, Share2, Trash2, UserRound, X } from '@lucide/vue';
import Card from '@/components/base/Card.vue';
import CardHead from '@/components/base/CardHead.vue';
import FormField from '@/components/base/FormField.vue';
import Overlay from '@/components/base/Overlay.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import ListGroup from '@/components/data/ListGroup.vue';
import ListRow from '@/components/data/ListRow.vue';
import SegmentedControl from '@/components/data/SegmentedControl.vue';
import Skeleton from '@/components/data/Skeleton.vue';
import ToneIcon from '@/components/data/ToneIcon.vue';
import HeaderButton from '@/components/layout/HeaderButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { Button } from '@/components/ui/button';
import { booksApi, type BookInvite, type BookMember, type BookRole } from '@/features/books/api';
import { useActiveBook } from '@/features/books/useActiveBook';
import {
  inviteLink,
  ROLE_HINT,
  ROLE_LABEL,
  useBookInvites,
  useBookMembers,
  useBookMutations,
} from '@/features/books/useBookAdmin';
import {
  addMonths,
  dayKey,
  MONTHS_LONG,
  MONTHS_SHORT,
  periodOf,
  periodRangeLabel,
} from '@/lib/time';

// Atur satu buku: nama, anggota dan peran, undangan, keluar, hapus.
// Peran ditegakkan RLS dan trigger; layar ini hanya menyembunyikan tombol.
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

const owners = computed(() => (members.data.value ?? []).filter((m) => m.role === 'owner').length);
const me = computed(() => members.data.value?.find((m) => m.is_me) ?? null);
const canLeave = computed(() => !!me.value && (me.value.role !== 'owner' || owners.value > 1));

// ---------- nama ----------
const name = ref('');
watch(book, (b) => b && !name.value && (name.value = b.name), { immediate: true });
function rename() {
  const value = name.value.trim();
  if (!value || !book.value || value === book.value.name) return;
  mutations.rename.mutate(
    { id: id.value, name: value },
    { onSuccess: () => toast.show('Nama buku disimpan') },
  );
}

// ---------- tanggal awal bulan ----------
const startDay = ref(1);
watch(book, (b) => b && (startDay.value = b.month_start_day), { immediate: true });
/** Contoh periode berjalan dengan tanggal pilihan, untuk pratinjau */
const startPreview = computed(() => {
  const p = periodOf(dayKey(new Date()), startDay.value);
  const next = addMonths(p.year, p.month, 1);
  return startDay.value === 1
    ? 'Bulan mengikuti kalender, tanggal 1 sampai akhir bulan.'
    : `Bulan ${MONTHS_LONG[p.month - 1]} = ${periodRangeLabel(p.year, p.month, startDay.value)}, ` +
        `${MONTHS_LONG[next.month - 1]} = ${periodRangeLabel(next.year, next.month, startDay.value)}.`;
});
function saveStartDay() {
  if (!book.value || startDay.value === book.value.month_start_day) return;
  mutations.setMonthStartDay.mutate(
    { id: id.value, day: startDay.value },
    { onSuccess: () => toast.show(`Bulan dimulai tanggal ${startDay.value}`) },
  );
}

// ---------- anggota ----------
const ROLES: { value: BookRole; label: string }[] = [
  { value: 'owner', label: ROLE_LABEL.owner },
  { value: 'editor', label: ROLE_LABEL.editor },
  { value: 'viewer', label: ROLE_LABEL.viewer },
];
function setRole(m: BookMember, role: BookRole) {
  if (role === m.role) return;
  mutations.setRole.mutate(
    { bookId: id.value, userId: m.user_id, role },
    { onSuccess: () => toast.show(`${m.display_name} sekarang ${ROLE_LABEL[role].toLowerCase()}`) },
  );
}
const removing = ref<BookMember | null>(null);
function confirmRemove() {
  const m = removing.value;
  removing.value = null;
  if (!m) return;
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
const deleteOpen = ref(false);
const isLastBook = computed(() => (books.value?.length ?? 0) <= 1);
function deleteBook() {
  deleteOpen.value = false;
  const deleted = book.value?.name ?? 'Buku';
  mutations.remove.mutate(id.value, {
    onSuccess: () => {
      toast.show(`Buku ${deleted} dihapus`);
      navigateTo('/settings/books', { replace: true });
    },
  });
}
</script>

<template>
  <div class="mx-auto md:max-w-[680px]">
    <PageHeader :title="book?.name ?? 'Buku'" :summary="book?.role ? ROLE_LABEL[book.role] : ''">
      <template #actions>
        <HeaderButton label="Kembali ke daftar buku" @click="navigateTo('/settings/books')">
          <ArrowLeft aria-hidden="true" />
        </HeaderButton>
        <HeaderButton v-if="book && book.id !== activeId" @click="setActiveBook(book.id)">
          <BookOpen aria-hidden="true" />Buka
        </HeaderButton>
      </template>
    </PageHeader>

    <Card v-if="!book && !members.isPending.value" class="mt-3.5">
      <EmptyState
        :icon="BookOpen"
        title="Buku tidak ditemukan"
        description="Mungkin sudah dihapus atau kamu sudah keluar."
      />
    </Card>

    <template v-else>
      <!-- Nama -->
      <Card v-if="isOwner" class="mt-3.5 p-3.5">
        <form class="flex items-end gap-2" @submit.prevent="rename">
          <FormField label="Nama buku" for="book-rename" class="flex-1">
            <input
              id="book-rename"
              v-model="name"
              type="text"
              maxlength="60"
              class="field-input"
              autocomplete="off"
            />
          </FormField>
          <Button
            type="submit"
            size="touch"
            variant="secondary"
            :disabled="!name.trim() || name.trim() === book?.name"
            >Simpan</Button
          >
        </form>
      </Card>

      <!-- Tanggal awal bulan -->
      <Card class="mt-3.5 p-3.5">
        <form v-if="isOwner" class="flex flex-col gap-2" @submit.prevent="saveStartDay">
          <div class="flex items-end gap-2">
            <FormField label="Bulan dimulai tanggal" for="book-start-day" class="flex-1">
              <select id="book-start-day" v-model.number="startDay" class="field-input">
                <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
              </select>
            </FormField>
            <Button
              type="submit"
              size="touch"
              variant="secondary"
              :disabled="
                startDay === book?.month_start_day || mutations.setMonthStartDay.isPending.value
              "
              >Simpan</Button
            >
          </div>
          <p class="m-0 text-xs text-muted-foreground">
            {{ startPreview }}
            <template v-if="startDay > 28">
              Bulan yang lebih pendek mulai di hari terakhirnya.</template
            >
            Berlaku untuk semua anggota: transaksi, statistik, dan budget.
          </p>
        </form>
        <p v-else class="m-0 text-meta">
          Bulan di buku ini dimulai tanggal <b>{{ book?.month_start_day ?? 1 }}</b
          >.
          <span class="text-muted-foreground">Hanya pemilik yang bisa mengubahnya.</span>
        </p>
      </Card>

      <!-- Anggota -->
      <Card v-if="members.isPending.value" class="mt-3.5 p-1"><Skeleton :rows="3" /></Card>
      <ListGroup v-else label="Anggota" :aside="`${members.data.value?.length ?? 0} orang`">
        <ListRow
          v-for="m in members.data.value"
          :key="m.user_id"
          :title="m.is_me ? `${m.display_name} (kamu)` : m.display_name"
          :subtitle="m.email ?? ROLE_LABEL[m.role]"
          class="flex-wrap"
        >
          <template #lead
            ><ToneIcon
              :icon="UserRound"
              :tone="m.role === 'owner' ? 'primary' : 'neutral'"
              size="sm"
          /></template>
          <template #end>
            <div class="flex items-center gap-1">
              <select
                v-if="isOwner && !(m.is_me && owners <= 1)"
                :value="m.role"
                class="field-input h-9! w-[124px] text-meta!"
                :aria-label="`Peran ${m.display_name}`"
                @change="setRole(m, ($event.target as HTMLSelectElement).value as BookRole)"
              >
                <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
              <span v-else class="text-xs font-semibold text-muted-foreground">{{
                ROLE_LABEL[m.role]
              }}</span>
              <Button
                v-if="isOwner && !m.is_me"
                variant="ghost"
                size="icon"
                :aria-label="`Keluarkan ${m.display_name}`"
                @click="removing = m"
              >
                <X />
              </Button>
            </div>
          </template>
        </ListRow>
      </ListGroup>

      <!-- Undang -->
      <Card v-if="isOwner" class="mt-3.5">
        <CardHead title="Undang anggota" />
        <form class="flex flex-col gap-3 px-3.5 pb-3.5" novalidate @submit.prevent="sendInvite">
          <FormField
            label="Email"
            for="invite-email"
            :error="inviteError"
            hint="Penerima masuk ke app dengan email ini untuk menerima undangan."
          >
            <input
              id="invite-email"
              v-model="inviteEmail"
              type="email"
              inputmode="email"
              autocomplete="off"
              autocapitalize="off"
              class="field-input"
              placeholder="nama@email.com"
              :aria-invalid="!!inviteError || undefined"
            />
          </FormField>
          <SegmentedControl v-model="inviteRole" :options="INVITE_ROLES" label="Peran" />
          <p class="m-0 text-xs text-muted-foreground">{{ ROLE_HINT[inviteRole] }}.</p>
          <div class="flex justify-end">
            <Button type="submit" size="touch" :disabled="mutations.invite.isPending.value"
              ><Mail />Undang</Button
            >
          </div>
        </form>
        <div v-if="lastInvite" class="flex flex-col gap-2 border-t px-3.5 py-3" aria-live="polite">
          <span class="text-meta">
            {{
              lastInvite.emailed
                ? `Email undangan terkirim ke ${lastInvite.invite.email}.`
                : `Kirim link ini ke ${lastInvite.invite.email} (WhatsApp, dsb.):`
            }}
          </span>
          <code
            class="select-all break-all rounded-lg bg-surface-2 px-2.5 py-2 font-mono text-xs"
            >{{ inviteLink(lastInvite.invite.token) }}</code
          >
          <div class="flex flex-wrap gap-2">
            <Button variant="secondary" size="default" @click="copyLink(lastInvite.invite.token)"
              ><Copy />Salin link</Button
            >
            <Button
              v-if="canShare"
              variant="secondary"
              size="default"
              @click="shareLink(lastInvite.invite.token)"
              ><Share2 />Bagikan</Button
            >
          </div>
        </div>
      </Card>

      <!-- Undangan menunggu -->
      <ListGroup
        v-if="isOwner && invites.data.value?.length"
        label="Menunggu diterima"
        :aside="`${invites.data.value.length} undangan`"
      >
        <ListRow
          v-for="inv in invites.data.value"
          :key="inv.id"
          :title="inv.email"
          :subtitle="`${ROLE_LABEL[inv.role]} · berlaku sampai ${expires(inv.expires_at)}`"
        >
          <template #lead><ToneIcon :icon="Mail" tone="warn" size="sm" /></template>
          <template #end>
            <div class="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                :aria-label="`Salin link undangan ${inv.email}`"
                @click="copyLink(inv.token)"
                ><Copy
              /></Button>
              <Button
                variant="ghost"
                size="icon"
                :aria-label="`Batalkan undangan ${inv.email}`"
                @click="
                  mutations.cancelInvite.mutate(inv.id, {
                    onSuccess: () => toast.show('Undangan dibatalkan'),
                  })
                "
                ><X
              /></Button>
            </div>
          </template>
        </ListRow>
      </ListGroup>

      <!-- Keluar / hapus -->
      <Card class="mt-5 flex flex-col gap-0.5 p-1">
        <ListRow
          v-if="me"
          :as="canLeave ? 'button' : 'div'"
          title="Keluar dari buku ini"
          :subtitle="
            canLeave
              ? 'Kamu tidak bisa melihat buku ini lagi sampai diundang ulang'
              : 'Jadikan anggota lain pemilik dulu'
          "
          :class="canLeave ? 'text-bad' : 'opacity-60'"
          @click="canLeave && (removing = me)"
        >
          <template #lead><ToneIcon :icon="LogOut" tone="bad" size="sm" /></template>
        </ListRow>
        <ListRow
          v-if="isOwner"
          :as="isLastBook ? 'div' : 'button'"
          title="Hapus buku"
          :subtitle="
            isLastBook
              ? 'Buku satu-satunya tidak bisa dihapus'
              : 'Semua akun, kategori, dan transaksinya ikut terhapus'
          "
          :class="isLastBook ? 'opacity-60' : 'text-bad'"
          @click="!isLastBook && (deleteOpen = true)"
        >
          <template #lead><ToneIcon :icon="Trash2" tone="bad" size="sm" /></template>
        </ListRow>
      </Card>
    </template>

    <!-- Konfirmasi: tidak bisa di-undo -->
    <Overlay
      :open="!!removing"
      labelledby="remove-title"
      @update:open="(v) => !v && (removing = null)"
    >
      <div v-if="removing" class="flex flex-col gap-3">
        <h2 id="remove-title" class="m-0 text-panel font-bold">
          {{ removing.is_me ? 'Keluar dari buku ini?' : `Keluarkan ${removing.display_name}?` }}
        </h2>
        <p class="m-0 text-meta text-muted-foreground">
          {{
            removing.is_me
              ? 'Transaksi yang sudah kamu catat tetap ada di buku ini.'
              : 'Transaksi yang sudah dicatatnya tetap ada. Kamu bisa mengundangnya lagi nanti.'
          }}
        </p>
        <div class="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" size="touch" @click="removing = null">Batal</Button>
          <Button variant="destructive" size="touch" @click="confirmRemove">{{
            removing.is_me ? 'Keluar' : 'Keluarkan'
          }}</Button>
        </div>
      </div>
    </Overlay>
    <Overlay v-model:open="deleteOpen" labelledby="delete-book-title">
      <div class="flex flex-col gap-3">
        <h2 id="delete-book-title" class="m-0 text-panel font-bold">
          Hapus buku {{ book?.name }}?
        </h2>
        <p class="m-0 text-meta text-muted-foreground">
          Semua akun, kategori, transaksi, template, dan budget di buku ini dihapus permanen untuk
          semua anggota. Ini tidak bisa diurungkan.
        </p>
        <div class="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" size="touch" @click="deleteOpen = false">Batal</Button>
          <Button variant="destructive" size="touch" @click="deleteBook">Hapus permanen</Button>
        </div>
      </div>
    </Overlay>
  </div>
</template>
