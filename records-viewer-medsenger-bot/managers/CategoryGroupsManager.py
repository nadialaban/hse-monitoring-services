from managers.Manager import Manager
from models import CategoryGroup


class CategoryGroupsManager(Manager):
    def __init__(self, *args):
        super(CategoryGroupsManager, self).__init__(*args)

    def get_all(self, available_categories):
        groups = CategoryGroup.query.all()
        groups = filter(lambda gr: set(gr.required_categories).issubset(
            available_categories) if not gr.at_least_one_category else
            len(set(gr.required_categories) & set(available_categories)) > 0, groups)
        groups = list(map(lambda gr: gr.as_dict(), groups))

        return groups

    def get(self, group_id):
        group = CategoryGroup.query.query.filter_by(id=group_id).first()

        if not group:
            raise Exception("No contract_id = {} found".format(group_id))

        return group.as_dict()
