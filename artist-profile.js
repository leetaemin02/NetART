(async () => {
  const el = id => document.getElementById(id);
  const gallery = el('artistGallery');
  if (!gallery) return;
  try {
    const response = await fetch('/api/artist');
    if (!response.ok) throw Error('Không tải được hồ sơ');
    const profile = await response.json();
    if (!profile) return;
    const name = profile.artistName || profile.name || 'Họa sĩ';
    el('artistName').textContent = name;
    const fullName = el('artistFullName');
    fullName.textContent = profile.name && profile.name !== name ? `Họ và tên: ${profile.name}` : '';
    fullName.hidden = !fullName.textContent;
    el('artistIntro').textContent = profile.shortIntroduction || 'Thông tin giới thiệu đang được cập nhật.';
    el('artistBio').textContent = profile.biography || '';
    const specialties = Array.isArray(profile.specialties) ? profile.specialties.join(' · ') : (profile.specialties || '');
    el('artistSpecialties').textContent = specialties;
    el('artistSpecialtiesRow').hidden = !specialties;
    el('artistLocation').textContent = profile.location || '';
    el('artistLocationRow').hidden = !profile.location;
    const phone = profile.contact?.phone || profile.phone || '';
    const email = profile.contact?.email || profile.email || '';
    const phoneLink = el('artistPhone');
    phoneLink.textContent = phone;
    phoneLink.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
    el('artistPhoneRow').hidden = !phone;
    const emailLink = el('artistEmail');
    emailLink.textContent = email;
    emailLink.href = `mailto:${email}`;
    el('artistEmailRow').hidden = !email;
    const socials = el('artistSocials');
    const socialLinks = [
      ['Zalo', profile.contact?.zaloUrl || profile.zaloUrl],
      ['Facebook', profile.contact?.facebookUrl || profile.facebookUrl],
      ['Instagram', profile.contact?.instagramUrl || profile.instagramUrl]
    ];
    for (const [label, url] of socialLinks) {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) continue;
      const link = document.createElement('a');
      link.textContent = `${label} ↗`;
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      socials.append(link);
    }
    document.title = `${name} — Về người vẽ — NÉT ART`;
    const contact = profile.contact?.zaloUrl || profile.contact?.facebookUrl;
    if (contact && /^https?:\/\//i.test(contact)) el('artistContact').href = contact;

    const images = (profile.galleryImages || []).filter(photo => /^https?:\/\//i.test(photo.url)).sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    if (!images.length && profile.avatar?.url) images.push({ url: profile.avatar.url, alt: name });
    if (!images.length && profile.coverImage?.url) images.push({ url: profile.coverImage.url, alt: name });
    if (images.length) {
      gallery.replaceChildren();
      gallery.classList.add('artist-slideshow');
      const img = document.createElement('img');
      img.alt = images[0].alt || name;
      gallery.append(img);
      let current = 0;
      const show = () => {
        img.src = images[current].url;
        img.alt = images[current].alt || `${name} — ảnh ${current + 1}`;
      };
      show();
      if (images.length > 1) window.setInterval(() => { current = (current + 1) % images.length; show(); }, 5000);
    }

    const works = profile.featuredArtworks || [];
    const grid = el('featured-grid');
    grid.replaceChildren();
    el('artistWorksNote').textContent = works.length ? '' : 'Các tác phẩm tiêu biểu sẽ được cập nhật tại đây.';
    for (const work of works) {
      const card = document.createElement('article');
      card.className = 'artwork';
      const picture = document.createElement('div');
      picture.className = 'art-image';
      const img = document.createElement('img');
      img.src = work.images?.find(item => item.isPrimary)?.url || work.images?.[0]?.url || '';
      img.alt = work.title || 'Tác phẩm';
      img.loading = 'lazy';
      picture.append(img);
      const title = document.createElement('h3');
      title.textContent = work.title;
      const detail = document.createElement('p');
      detail.textContent = [work.material, work.yearCreated].filter(Boolean).join(' · ');
      const meta = document.createElement('div');
      meta.className = 'art-meta';
      const state = document.createElement('strong');
      state.textContent = work.showPrice && Number.isFinite(work.price) ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(work.price) : 'Liên hệ';
      meta.append(state);
      card.append(picture, title, detail, meta);
      grid.append(card);
    }
  } catch (error) {
    el('artistWorksNote').textContent = 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại sau.';
    el('featured-grid').replaceChildren();
    console.warn('Artist profile:', error.message);
  }
})();
