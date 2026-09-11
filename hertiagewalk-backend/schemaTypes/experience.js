// hertiagewalk-backend/schemaTypes/experience.js
//
// Editorial/public-presentation content for a Walk/Seminar/Course "Experience"
// — the SQL ExperienceTemplate (Azure SQL) stays the authoritative workflow
// record (status, price, capacity, booking form link); this schema only holds
// what's safe/useful to show publicly. See docs/form-generator/ Experiences
// module spec §16/§22. Inert until ArchaeoTrails.Api's SanityContentService
// has a real write token — see hertiagewalkApi/.../SanityContentService.cs.

export default {
  name: 'experience',
  title: 'Experiences (Walk / Seminar / Course)',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
    },
    {
      name: 'slug',
      title: 'Slug (Unique ID)',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
    },
    {
      name: 'experienceType',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Walk', value: 'walk' },
          { title: 'Seminar', value: 'seminar' },
          { title: 'Course', value: 'course' },
        ],
      },
    },
    {
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'gallery',
      title: 'Image Gallery',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
    },
    {
      name: 'video',
      title: 'Video URL',
      type: 'url',
    },
    {
      name: 'shortDescription',
      title: 'Short Description',
      type: 'text',
      rows: 3,
    },
    {
      name: 'fullDescription',
      title: 'Full Description',
      type: 'text',
      rows: 8,
    },
    {
      name: 'highlights',
      title: 'Highlights',
      type: 'array',
      of: [{ type: 'string' }],
    },
    {
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'faqItem',
          fields: [
            { name: 'question', title: 'Question', type: 'string' },
            { name: 'answer', title: 'Answer', type: 'text', rows: 3 },
          ],
        },
      ],
    },
  ],
}
